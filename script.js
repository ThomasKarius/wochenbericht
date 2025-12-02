// ==========================
// Wochenbericht – komplette Logik
// ==========================

// ---- Hilfsfunktionen für Kalenderwoche ----
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function getCurrentWeekNumber() {
  return getISOWeek(new Date());
}

// ---- Tabellenzeilen erzeugen ----
const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const daysContainer = document.getElementById("days");

dayNames.forEach((name, i) => {
  daysContainer.innerHTML += `
    <tr data-id="${i}">
        <td>${name}</td>
        <td><input type="time" class="start" name="start-${i}"></td>
        <td><input type="number" class="pause" name="pause-${i}" min="0" value="0"></td>
        <td><input type="time" class="end" name="end-${i}"></td>
        <td class="result"></td>
        <td><input type="text" class="tour" name="tour-${i}"></td>
        <td><input type="text" class="spesen" name="spesen-${i}"></td>
    </tr>`;
});

// ---- Zeit-Hilfsfunktionen ----
function parseTime(value) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// ---- Hauptberechnung (Stunden + Spesen) ----
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

    const spesenVal = row.querySelector(".spesen").value.replace(",", ".");
    if (!isNaN(parseFloat(spesenVal))) {
      totalSpesen += parseFloat(spesenVal);
    }
  });

  document.getElementById("total-hours").textContent = minutesToHHMM(totalMinutes);
  document.getElementById("total-spesen").textContent =
    totalSpesen.toFixed(2).replace(".", ",") + " €";
}

// ==========================
// Lokales Speichern (localStorage)
// ==========================

const STORAGE_KEY_DATA = "wochenberichtData";
const STORAGE_KEY_WEEK = "wochenberichtKW";

// Alle Eingaben speichern
function saveAllInputs() {
  const data = {};

  document.querySelectorAll("input").forEach(input => {
    const key = input.id || input.name;
    if (!key) return;
    data[key] = input.value;
  });

  localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));

  const currentWeek = getCurrentWeekNumber();
  localStorage.setItem(STORAGE_KEY_WEEK, String(currentWeek));
}

// Eingaben laden
function loadAllInputs() {
  const raw = localStorage.getItem(STORAGE_KEY_DATA);
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  document.querySelectorAll("input").forEach(input => {
    const key = input.id || input.name;
    if (!key) return;
    if (data[key] !== undefined) {
      input.value = data[key];
    }
  });
}

// Beim Start entscheiden: alte Daten behalten oder löschen
window.addEventListener("DOMContentLoaded", () => {
  const currentWeek = getCurrentWeekNumber();
  const savedWeek = localStorage.getItem(STORAGE_KEY_WEEK);

  const kwInput = document.getElementById("kw");
  if (kwInput && !kwInput.value) {
    kwInput.value = currentWeek; // KW automatisch setzen
  }

  if (savedWeek && parseInt(savedWeek) === currentWeek) {
    // gleiche Woche -> Daten laden
    loadAllInputs();
    update();
  } else {
    // neue Woche -> alte Daten löschen
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.setItem(STORAGE_KEY_WEEK, String(currentWeek));
  }
});

// Bei jedem Input neu berechnen + speichern
document.addEventListener("input", () => {
  update();
  saveAllInputs();
});

// ==========================
// WhatsApp – Textversand
// ==========================
document.getElementById("send-whatsapp").onclick = () => {
  let text = "Wochenbericht\n";

  const name = document.getElementById("name").value || "";
  const from = document.getElementById("from").value || "";
  const to = document.getElementById("to").value || "";
  const kw = document.getElementById("kw").value || "";

  if (name) text += "Name: " + name + "\n";
  if (from || to) text += "Zeitraum: " + from + " - " + to + "\n";
  if (kw) text += "KW: " + kw + "\n";

  text += "\n";

  document.querySelectorAll("#days tr").forEach(row => {
    const dayName = row.children[0].textContent;
    const s = row.querySelector(".start").value;
    const e = row.querySelector(".end").value;
    const p = row.querySelector(".pause").value;
    const h = row.querySelector(".result").textContent;
    const t = row.querySelector(".tour").value;
    const sp = row.querySelector(".spesen").value;

    if (s || e || t || sp) {
      text += `${dayName}: ${s || "-"} - ${e || "-"}, Pause ${p || "0"} Min, Std ${h || "00:00"}, Tour ${t || "-"}, Spesen ${sp || "0"}\n`;
    }
  });

  text += "\nGesamtstunden: " + document.getElementById("total-hours").textContent;
  text += "\nSpesen gesamt: " + document.getElementById("total-spesen").textContent;

  window.open("https://wa.me/?text=" + encodeURIComponent(text));
};

// ==========================
// Unterschrift-Pad
// ==========================
const canvas = document.getElementById("signature-pad");
const ctx = canvas.getContext("2d");
let drawing = false;

function resizeSignatureCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
}

window.addEventListener("resize", resizeSignatureCanvas);
resizeSignatureCanvas();

canvas.addEventListener("pointerdown", e => {
  drawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener("pointerup", () => {
  drawing = false;
});

canvas.addEventListener("pointerleave", () => {
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

// ==========================
// PDF Export
// ==========================
document.getElementById("pdf-button").onclick = async () => {
  const { jsPDF } = window.jspdf;

  const element = document.querySelector(".wrapper");
  const canvasPDF = await html2canvas(element, { scale: 2 });
  const imgData = canvasPDF.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = 210;
  const pdfHeight = (canvasPDF.height * 210) / canvasPDF.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("wochenbericht.pdf");

  if (navigator.canShare && navigator.canShare({ files: [] })) {
    const blob = pdf.output("blob");
    const file = new File([blob], "wochenbericht.pdf", {
      type: "application/pdf"
    });

    try {
      await navigator.share({
        title: "Wochenbericht",
        files: [file]
      });
    } catch (err) {
      console.log("Teilen abgebrochen oder nicht möglich:", err);
    }
  } else {
    alert("PDF wurde gespeichert. Öffne es und sende es manuell über WhatsApp.");
  }
};



