// =======================================
// Tabellen-Erzeugung
// =======================================

const days = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const tbody = document.getElementById("days");

days.forEach((d, i) => {
    tbody.innerHTML += `
        <tr>
            <td>${d}</td>
            <td><input type="time" name="start${i}"></td>
            <td><input type="number" name="pause${i}" min="0" value="0" style="width:50px"></td>
            <td><input type="time" name="end${i}"></td>
            <td id="hours${i}"></td>
            <td><input type="text" name="tour${i}"></td>
            <td><input type="text" maxlength="3" name="spesen${i}" style="width:40px"></td>
        </tr>
    `;
});

// =======================================
// Stundenberechnung
// =======================================

function calcTime() {
    let total = 0;
    let spesenTotal = 0;

    days.forEach((_, i) => {
        const s = document.querySelector(`[name=start${i}]`).value;
        const p = parseInt(document.querySelector(`[name=pause${i}]`).value || 0);
        const e = document.querySelector(`[name=end${i}]`).value;

        if (s && e) {
            const start = toMin(s);
            const end = toMin(e);
            let diff = end - start - p;
            if (diff < 0) diff = 0;

            total += diff;
            document.getElementById(`hours${i}`).textContent = toHHMM(diff);
        }

        const sp = parseFloat(document.querySelector(`[name=spesen${i}]`).value.replace(",","."));
        if (!isNaN(sp)) spesenTotal += sp;
    });

    document.getElementById("total-hours").textContent = toHHMM(total);
    document.getElementById("total-spesen").textContent = spesenTotal.toFixed(2) + " €";
}

function toMin(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function toHHMM(min) {
    return String(Math.floor(min / 60)).padStart(2,"0") + ":" + String(min % 60).padStart(2,"0");
}

document.addEventListener("input", calcTime);

// =======================================
// Unterschrift
// =======================================

const canvas = document.getElementById("signature");
const ctx = canvas.getContext("2d");
let drawing = false;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
}
resizeCanvas();

canvas.addEventListener("pointerdown", e => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
});

canvas.addEventListener("pointerup", () => drawing = false);
canvas.addEventListener("pointerleave", () => drawing = false);

// =======================================
// PDF + WhatsApp
// =======================================

document.getElementById("send-pdf").onclick = async () => {
    const { jsPDF } = window.jspdf;

    const element = document.querySelector(".wrapper");
    const c = await html2canvas(element, { scale: 2 });
    const imgData = c.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = (c.height * 210) / c.width;

    pdf.addImage(imgData, "PNG", 0, 0, w, h);

    const blob = pdf.output("blob");
    const file = new File([blob], "wochenbericht.pdf", { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            title: "Wochenbericht",
            files: [file]
        });
    } else {
        pdf.save("wochenbericht.pdf");
        alert("PDF gespeichert. Bitte manuell per WhatsApp senden.");
    }
};


