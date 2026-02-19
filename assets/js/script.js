class ShiftManager {
	constructor() {
		this.shifts = [];
		this.initializeElements();
		this.attachEventListeners();
		this.loadFromStorage();
		this.updatePreview();
	}

	initializeElements() {
		// Input elements
		this.shiftTitle = document.getElementById("shiftTitle");
		this.startTime = document.getElementById("startTime");
		this.endTime = document.getElementById("endTime");
		this.hourlyRate = document.getElementById("hourlyRate");
		this.breakMinutes = document.getElementById("breakMinutes");
		this.overnightSelect = document.getElementById("overnightSelect");
		this.shiftDate = document.getElementById("shiftDate");
		this.currencySelect = document.getElementById("currencySelect");

		// Preview elements
		this.previewTitle = document.getElementById("previewTitle");
		this.previewHours = document.getElementById("previewHours");
		this.previewPay = document.getElementById("previewPay");

		// Buttons
		this.addBtn = document.getElementById("addShiftBtn");
		this.clearAllBtn = document.getElementById("clearAllBtn");

		// Containers
		this.shiftsContainer = document.getElementById("shiftsContainer");
		this.totalAmount = document.getElementById("totalAmount");
		this.shiftCount = document.getElementById("shiftCount");

		// Set today's date as default
		if (!this.shiftDate.value) {
			const today = new Date().toISOString().split("T")[0];
			this.shiftDate.value = today;
		}
	}

	attachEventListeners() {
		// Live preview updates
		this.shiftTitle.addEventListener("input", () => this.updatePreview());
		this.startTime.addEventListener("input", () => this.updatePreview());
		this.endTime.addEventListener("input", () => this.updatePreview());
		this.hourlyRate.addEventListener("input", () => this.updatePreview());
		this.breakMinutes.addEventListener("change", () => this.updatePreview());
		this.overnightSelect.addEventListener("change", () => this.updatePreview());
		this.currencySelect.addEventListener("change", () => {
			this.updatePreview();
			this.updateAllShifts();
		});

		// Add shift button
		this.addBtn.addEventListener("click", () => this.addShift());

		// Clear all button
		this.clearAllBtn.addEventListener("click", () => this.clearAllShifts());
	}

	timeToDecimal(timeStr) {
		if (!timeStr) return 0;
		const [hours, minutes] = timeStr.split(":").map(Number);
		return hours + minutes / 60;
	}

	calculateShiftDetails() {
		const startStr = this.startTime.value;
		const endStr = this.endTime.value;
		const rate = parseFloat(this.hourlyRate.value) || 0;
		const breakMins = parseInt(this.breakMinutes.value, 10) || 0;
		const isOvernight = this.overnightSelect.value === "yes";

		if (!startStr || !endStr) return null;

		let startDec = this.timeToDecimal(startStr);
		let endDec = this.timeToDecimal(endStr);

		// Handle overnight shifts
		let adjustedEnd = endDec;
		if (isOvernight) {
			if (endDec <= startDec) {
				adjustedEnd = endDec + 24;
			}
		} else {
			if (endDec < startDec) {
				adjustedEnd = endDec + 24;
			} else {
				adjustedEnd = endDec;
			}
		}

		let rawHours = adjustedEnd - startDec;
		if (rawHours < 0) rawHours = 0;

		// Subtract break
		const breakHours = breakMins / 60;
		let netHours = rawHours - breakHours;
		if (netHours < 0) netHours = 0;

		const total = netHours * rate;

		return {
			hours: netHours,
			pay: total,
			rate: rate,
			breakMins: breakMins,
		};
	}

	updatePreview() {
		const details = this.calculateShiftDetails();
		const title = this.shiftTitle.value || "Untitled shift";
		const currency = this.currencySelect.value;

		this.previewTitle.textContent = title;

		if (details) {
			this.previewHours.textContent = `${details.hours.toFixed(1)} h`;
			this.previewPay.textContent = `${currency}${details.pay.toFixed(2)}`;
		} else {
			this.previewHours.textContent = "0.0 h";
			this.previewPay.textContent = `${currency}0.00`;
		}
	}

	addShift() {
		const details = this.calculateShiftDetails();
		if (!details) {
			alert("Please set valid start and end times");
			return;
		}

		const shift = {
			id: Date.now() + Math.random().toString(36).substr(2, 5),
			title: this.shiftTitle.value || "Untitled shift",
			date: this.shiftDate.value || new Date().toISOString().split("T")[0],
			startTime: this.startTime.value,
			endTime: this.endTime.value,
			hours: details.hours,
			rate: details.rate,
			pay: details.pay,
			breakMins: details.breakMins,
			currency: this.currencySelect.value,
			overnight: this.overnightSelect.value === "yes",
		};

		this.shifts.push(shift);
		this.saveToStorage();
		this.renderShifts();
		this.updatePreview(); // Refresh preview
	}

	deleteShift(id) {
		this.shifts = this.shifts.filter((shift) => shift.id !== id);
		this.saveToStorage();
		this.renderShifts();
	}

	clearAllShifts() {
		if (
			this.shifts.length > 0 &&
			confirm("Are you sure you want to clear all shifts?")
		) {
			this.shifts = [];
			this.saveToStorage();
			this.renderShifts();
		}
	}

	updateAllShifts() {
		// Update currency display for all shifts
		this.renderShifts();
	}

	calculateGrandTotal() {
		return this.shifts.reduce((sum, shift) => sum + shift.pay, 0);
	}

	formatDate(dateStr) {
		const options = { year: "numeric", month: "short", day: "numeric" };
		return new Date(dateStr).toLocaleDateString(undefined, options);
	}

	renderShifts() {
		const container = this.shiftsContainer;
		const currency = this.currencySelect.value;

		if (this.shifts.length === 0) {
			container.innerHTML =
				'<div class="empty-state">✨ no shifts yet — add your first shift</div>';
		} else {
			container.innerHTML = this.shifts
				.sort((a, b) => new Date(b.date) - new Date(a.date))
				.map(
					(shift) => `
                    <div class="shift-item" data-id="${shift.id}">
                        <div class="shift-header">
                            <span class="shift-title">${this.escapeHtml(shift.title)}</span>
                            <span class="shift-date">${this.formatDate(shift.date)}</span>
                        </div>
                        <div class="shift-details">
                            <span class="shift-hours">${shift.hours.toFixed(1)} h</span>
                            <span class="shift-rate">${currency}${shift.rate.toFixed(2)}/h</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="shift-pay">${shift.currency}${shift.pay.toFixed(2)}</span>
                            <button class="delete-shift" onclick="shiftManager.deleteShift('${shift.id}')" title="delete shift">✕</button>
                        </div>
                        <div style="font-size: 0.7rem; color: #6c757d; margin-top: 0.3rem;">
                            ${shift.startTime} - ${shift.endTime} ${shift.overnight ? "🌙" : ""} • break: ${shift.breakMins}min
                        </div>
                    </div>
                `,
				)
				.join("");
		}

		// Update totals
		const grandTotal = this.calculateGrandTotal();
		this.totalAmount.textContent = `${currency}${grandTotal.toFixed(2)}`;
		this.shiftCount.textContent = `total shifts: ${this.shifts.length}`;
	}

	escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	saveToStorage() {
		localStorage.setItem("shifts", JSON.stringify(this.shifts));
	}

	loadFromStorage() {
		const saved = localStorage.getItem("shifts");
		if (saved) {
			try {
				this.shifts = JSON.parse(saved);
			} catch (e) {
				this.shifts = [];
			}
		}
		this.renderShifts();
	}
}

// Initialize the app
const shiftManager = new ShiftManager();

// Make delete function globally accessible
window.shiftManager = shiftManager;
