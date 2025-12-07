document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // Tabelle erzeugen
    // ============================

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

    // ============================
    // Stunden & Spesen berechnen
    // ============================

    function toMin(t) {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function toHHMM(min) {
        return (
            String(Math.floor(min / 60)).padStart(2, "0") +
            ":" +
            String(min % 60).padStart(2, "0")
        );
    }

    function calcTime() {
        let total = 0;
        let spesenTotal = 0;

        days.forEach((_, i) => {
            const s = document.querySelector(`[name=start${i}]`).value;
            const p = parseInt(document.querySelector(`[name=pause${i}]`).value || 0);
            const e = document.querySelector(`[name=end${i}]`).value;

            if (s && e) {
                const diff = Math.max(0, toMin(e) - toMin(s) - p);
                total += diff;
                document.getElementById(`hours${i}`).textContent = toHHMM(diff);
            } else {
                document.getElementById(`hours${i}`).textContent = "";
            }

            const spRaw = document.querySelector(`[name=spesen${i}]`).value;
            const sp = parseFloat(spRaw.replace(",", "."));
            if (!isNaN(sp)) spesenTotal += sp;
        });

        document.getElementById("total-hours").textContent = toHHMM(total);
        document.getElementById("total-spesen").textContent = spesenTotal.toFixed(2) + " €";

        saveData();
    }

    document.addEventListener("input", calcTime);

    // ============================
    // Unterschrift
    // ============================

    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    let drawing = false;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

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

    // ============================
    // Unterschrift löschen
    // ============================

    document.getElementById("clear-signature").onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveData();
    };

    // ============================
    // Daten speichern & laden
    // ============================

    const STORAGE_KEY = "wochenbericht_v1";

    function saveData() {
        const data = {
            fields: {},
            signature: canvas.toDataURL()
        };

        document.querySelectorAll("input").forEach(inp => {
            const key = inp.id || inp.name;
            if (key) data.fields[key] = inp.value;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        try {
            const data = JSON.parse(raw);

            if (data.fields) {
                for (const key in data.fields) {
                    const inp = document.querySelector(
                        `[id='${key}'], [name='${key}']`
                    );
                    if (inp) inp.value = data.fields[key];
                }
            }

            if (data.signature) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = data.signature;
            }

            calcTime();
        } catch (e) {
            console.error("Fehler beim Laden der gespeicherten Daten:", e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    loadData();

    // ============================
    // Woche manuell zurücksetzen
    // ============================

    document.getElementById("reset-week").onclick = () => {
        if (!confirm("Wirklich die ganze Woche löschen?")) return;

        // alle Inputs leeren
        document.querySelectorAll("input").forEach(inp => inp.value = "");

        // Stunden & Spesen zurücksetzen
        document.getElementById("total-hours").textContent = "00:00";
        document.getElementById("total-spesen").textContent = "0,00 €";

        // Zeilenstunden löschen
        days.forEach((_, i) => {
            document.getElementById(`hours${i}`).textContent = "";
        });

        // Unterschrift löschen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Speicher löschen
        localStorage.removeItem(STORAGE_KEY);
    };

    // ============================
    // PDF per WhatsApp senden
    // ============================

    document.getElementById("send-pdf").onclick = async () => {
        const { jsPDF } = window.jspdf;

        const element = document.querySelector(".wrapper");
        const screenshot = await html2canvas(element, { scale: 2 });
        const imgData = screenshot.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const w = 210;
        const h = (screenshot.height * 210) / screenshot.width;

        pdf.addImage(imgData, "PNG", 0, 0, w, h);

        const blob = pdf.output("blob");
        const file = new File([blob], "wochenbericht.pdf", {
            type: "application/pdf"
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: "Wochenbericht",
                files: [file],
                text: "Wochenbericht"
            });
        } else {
            pdf.save("wochenbericht.pdf");
            alert("PDF gespeichert – dein Gerät unterstützt kein direktes WhatsApp-Sharing.");
        }
    };

});


