const dayNames = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const daysContainer = document.getElementById("days");

dayNames.forEach((name, i) => {
    daysContainer.innerHTML += `
    <tr data-id="${i}">
        <td>${name}</td>
        <td><input type="time" class="start"></td>
        <td><input type="number" class="pause" min="0" value="0"></td>
        <td><input type="time" class="end"></td>
        <td class="result"></td>
        <td><input type="text" class="tour"></td>
        <td><input type="text" class="spesen"></td>
    </tr>`;
});

// Parse Time
function parseTime(value) {
    if (!value) return null;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
}

// Convert minutes to HH:MM
function minutesToHHMM(min) {
    return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Update calculations
function update() {
    let totalMinutes = 0;
    let totalSpesen = 0;

    document.querySelectorAll("#days tr").forEach(row => {
        const start = parseTime(row.querySelector(".start").value);
        const end = parseTime(row.querySelector(".end").value);
        const pause = parseInt(row.querySelector(".pause").value || 0);

        if (start !== null && end !== null) {
            let diff = end - start - pause;
            if (diff < 0) diff = 0;
            row.querySelector(".result").textContent = minutesToHHMM(diff);
            totalMinutes += diff;
        } else {
            row.querySelector(".result").textContent = "";
        }

        const spesen = row.querySelector(".spesen").value.replace(",", ".");
        if (!isNaN(parseFloat(spesen))) {
            totalSpesen += parseFloat(spesen);
        }
    });

    document.getElementById("total-hour
