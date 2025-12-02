// ==========================
// Wochenbericht – komplette Logik
// ==========================

// ---- Kalenderwoche berechnen ----
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getCurrentWeek() {
    return getISOWeek(new Date());
}

// ---- Tabelle generieren ----
const dayNames = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const daysContainer = document.getElementById("days");

dayNames.forEach((name, i) => {
    daysContainer.innerHTML += `
        <tr>
            <td>${name}</td>
            <td><input type="time" class="start" name="start-${i}"></td>
            <td><input type="number" class="pause" name="pause-${i}" min="0" value="0"></td>
            <td><input type="time" class="end" name="end-${i}"></td>
            <td class="result"></td>
            <td><input type="text" class="tour" name="tour-${i}"></td>
            <td><input type="text" class="spesen" name="spesen-${i}"></td>
        </tr>
    `;
});

// ---- Zeitfunktionen ----
function parseTime(value) {
    if (!value) return null;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
}

function minutesToHHMM(min) {
    return `${String(Math.floor(min / 60)).padStart(2,"0")}:${String(min % 60).padStart(2,"0")}`;
}

// ---- Stunden + Spesen Berechnung ----
function update() {
    let totalMinutes = 0;
    let totalSpesen = 0;

    document.querySelectorAll("#days tr").forEach(row => {
        const start = parseTime(row.querySelector(".start").value);
        const end   = parseTime(row.querySelector(".end").value);
        const pause = parseInt(row.querySelector(".pause").value || 0);

        if (start !== null && end !== null) {
            let diff = end - start - pause;
            if (diff < 0) diff = 0;
            row.querySelector(".result").textContent = minutesToHHMM(diff);
            totalMinutes += diff;
        } else {
            row.querySelector(".result").textContent = "";
        }

        let sp = row.querySelector(".spesen").value.replace(",",".");
        if (!isNaN(parseFloat(sp))) totalSpesen += parseFloat(sp);
    });

    document.getElementById("total-hours").textContent = minutesToHHMM(totalMinutes);
    document.getElementById("total-spesen").textContent =
        totalSpesen.toFixed(2).replace(".",",") + " €";
}

// ==========================
// Daten speichern (localStorage)
// ==========================

const STORAGE_DATA = "wochenberichtData";
const STORAGE_WEEK = "wochenberichtKW";

// Daten speichern
function saveAllInputs() {
    const data = {};
    document.querySelectorAll("input").forEach(input => {
        const key = input.id || input.name;
        if (key) data[key] = input.value;
    });

    localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
    localStorage.setItem(STORAGE_WEEK, getCurrentWeek());
}

// Daten laden
function loadAllInputs() {
    const raw = localStorage.getItem(STORAGE_DATA);
    if (!raw) return;
    const data = JSON.parse(raw);

    document.querySelectorAll("input").forEach(input => {
        const key = input.id || input.name;
        if (data[key] !== undefined) input.value = data[key];
    });
}

// Beim Start prüfen ob neue Woche
window.addEventListener("DOMContentLoaded", () => {
    const savedWeek = parseInt(localStorage.getItem(STORAGE_WEEK));
    const currentWeek = getCurrentWeek();

    // KW automatisch setzen
    const kwField = document.getElementById("kw");
    if (kwField && !kwField.value) kwField.value = currentWeek;

    if (savedWeek === currentWeek) {
        loadAllInputs();
        update();
    } else {
        localStorage.removeItem(STORAGE_DATA);
        localStorage.setItem(STORAGE_WEEK, currentWeek);
    }
});

// Live speichern + rechnen
document.addEventListener("input", () => {
    update();
    saveAllInputs();
});

// ==========================
// Unterschrift Pad (Touch + Maus)
// ==========================
const canvas = document.getElementById("signature-pad");
const ctx = canvas.getContext("2d");
let drawing = false;

function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX || e.touches[0].clientX) - rect.left,
        y: (e.clientY || e.touches[0].clientY) - rect.top
    };
}

canvas.addEventListener("pointerdown", e => {
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
});

canvas.addEventListener("pointerup", () => drawing = false);
canvas.addEventListener("pointerleave", () => drawing = false);

document.getElementById("clear-signature").onclick = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
};

// ==========================
// PDF Export + WhatsApp
// ==========================
document.getElementById("pdf-whatsapp").onclick = async () => {
    const { jsPDF } = window.jspdf;

    const element = document.querySelector(".wrapper");
    const canvasPDF = await html2canvas(element, { scale: 2 });
    const imgData = canvasPDF.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = (canvasPDF.height * 210) / canvasPDF.width;

    pdf.addImage(imgData, "PNG", 0, 0, w, h);

    const blob = pdf.output("blob");
    const file = new File([blob], "wochenbericht.pdf", { type: "application/pdf" });

    // Teilen möglich?
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
            title: "Wochenbericht",
            files: [file]
        });
        return;
    }

    // Fallback
    pdf.save("wochenbericht.pdf");
    alert("PDF gespeichert. Öffne es und sende es über WhatsApp.");
};




