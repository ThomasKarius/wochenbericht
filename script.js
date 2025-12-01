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

    document.getElementById("total-hours").textContent = minutesToHHMM(totalMinutes);
    document.getElementById("total-spesen").textContent =
        totalSpesen.toFixed(2).replace(".", ",") + " €";
}

document.addEventListener("input", update);

// WhatsApp sharing
document.getElementById("send-whatsapp").onclick = () => {
    let text = "Wochenbericht\n";
    text += "Name: " + document.getElementById("name").value + "\n";

    document.querySelectorAll("#days tr").forEach(row => {
        const name = row.children[0].textContent;
        const s = row.querySelector(".start").value;
        const e = row.querySelector(".end").value;
        const p = row.querySelector(".pause").value;
        const h = row.querySelector(".result").textContent;
        const t = row.querySelector(".tour").value;
        const sp = row.querySelector(".spesen").value;

        if (s || e || t || sp) {
            text += `${name}: ${s}-${e}, Pause ${p}, Std ${h}, Tour ${t}, Spesen ${sp}\n`;
        }
    });

    text += "\nGesamtstunden: " + document.getElementById("total-hours").textContent;
    text += "\nSpesen gesamt: " + document.getElementById("total-spesen").textContent;

    window.open("https://wa.me/?text=" + encodeURIComponent(text));
};

// Signature Pad
const canvas = document.getElementById("signature-pad");
const ctx = canvas.getContext("2d");
let drawing = false;

// Resize canvas to device pixel ratio
function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
}

resize();
window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", e => {
    drawing = true;
    ctx.beginPath();
});

canvas.addEventListener("pointerup", () => {
    drawing = false;
});

canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
});

document.getElementById("clear-signature").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

