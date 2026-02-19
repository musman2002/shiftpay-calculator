    (function() {
        // DOM elements
        const startInput = document.getElementById('startTime');
        const endInput = document.getElementById('endTime');
        const rateInput = document.getElementById('hourlyRate');
        const breakSelect = document.getElementById('breakMinutes');
        const overnightSelect = document.getElementById('overnightSelect');

        const totalPaySpan = document.getElementById('totalPayDisplay');
        const hoursDisplaySpan = document.getElementById('hoursDisplay');
        const rateNoteSpan = document.getElementById('rateNote');

        // reset to default values
        function resetToDefault() {
            startInput.value = '09:00';
            endInput.value = '17:30';
            rateInput.value = '22.50';
            breakSelect.value = '30';
            overnightSelect.value = 'no';
            updatePay(); // refresh display
        }

        // convert HH:MM to decimal hours (returns float)
        function timeToDecimal(timeStr) {
            if (!timeStr) return 0;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours + (minutes / 60);
        }

        // main calculation & update
        function updatePay() {
            const startStr = startInput.value;
            const endStr = endInput.value;
            const rate = parseFloat(rateInput.value) || 0;
            const breakMins = parseInt(breakSelect.value, 10) || 0;

            if (!startStr || !endStr) {
                totalPaySpan.innerText = '—';
                hoursDisplaySpan.innerText = '0.0';
                rateNoteSpan.innerText = '—';
                return;
            }

            let startDec = timeToDecimal(startStr);
            let endDec = timeToDecimal(endStr);

            // overnight logic
            const isOvernight = overnightSelect.value === 'yes';

            // if overnight is NOT selected but end is numerically smaller (e.g. 23:00 → 05:00) we assume user forgot overnight toggle → treat as overnight anyway? better to follow toggle.
            // but we also adjust: if overnight is selected AND end < start (typical), add 24.
            let adjustedEnd = endDec;
            if (isOvernight) {
                if (endDec <= startDec) {
                    adjustedEnd = endDec + 24;
                } // else if endDec > startDec but overnight selected? maybe shift ends next day afternoon? still add 24? ambiguous -> but keep simple: if overnight flag, force add 24 only when end <= start.
            } else {
                // same day: if endDec < startDec probably error -> but we can push end to next day? show negative? better to assume small mistake -> add 24h anyway and show note? we'll handle gracefully:
                if (endDec < startDec) {
                    // likely overnight but toggle off: adjust by adding 12? no, better adjust +24, but show that overnight should be selected. We'll add 24 but keep visual.
                    adjustedEnd = endDec + 24;
                } else {
                    adjustedEnd = endDec;
                }
            }

            let rawHours = adjustedEnd - startDec;   // could be negative if start>end and not overnight? but we handled above.

            // final safety: if rawHours negative (shouldn't happen after adjustments) set to 0.
            if (rawHours < 0) rawHours = 0;

            // subtract unpaid break (minutes → hours)
            const breakHours = breakMins / 60;
            let netHours = rawHours - breakHours;
            if (netHours < 0) netHours = 0;   // avoid negative hours

            // calculate total pay
            const total = netHours * rate;

            // format outputs
            const formattedTotal = total.toFixed(2);
            const localeTotal = Number(formattedTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            totalPaySpan.innerText = `$${formattedTotal}`;   // keep $ for clarity, can adapt

            hoursDisplaySpan.innerText = netHours.toFixed(1);
            rateNoteSpan.innerHTML = `${rate.toFixed(2)}/h × ${netHours.toFixed(1)} h`;

            // subtle: if break made netHours>raw? it's fine.
        }

        // attach event listeners
        [startInput, endInput, rateInput, breakSelect, overnightSelect].forEach(el => {
            el.addEventListener('input', updatePay);
            el.addEventListener('change', updatePay);
        });

        // reset button
        document.getElementById('resetButton').addEventListener('click', resetToDefault);

        // initialize
        updatePay();

        // extra: fix step on rate input to allow decimals
        rateInput.addEventListener('blur', function() {
            let v = parseFloat(this.value);
            if (isNaN(v) || v < 0) this.value = 0;
            updatePay();
        });

        // ensure time fields are valid on blur
        [startInput, endInput].forEach(field => {
            field.addEventListener('blur', function() {
                if (!this.value) this.value = '00:00';
                updatePay();
            });
        });
    })();
