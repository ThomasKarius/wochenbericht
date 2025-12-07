document.addEventListener("DOMContentLoaded", () => {

    // ====================================================
    // Aktuelle Kalenderwoche automatisch bestimmen
    // ====================================================
    function getWeekNumber(date = new Date()) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    const currentKW = getWeekNumber();

    // ====================================================
    // Tabelle erzeugen
    // ====================================================
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

    // ====================================================
    // Berechnung
    // ====================================================
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
            }

            const sp = parseFloat(
                document.querySelector(`[name=spesen${i}]`).value.replace(",", ".")
            );
            if (!isNaN(sp)) spesenTotal += sp;
        });

        document.getElementById("total-hours").textContent = toHHMM(total);
        document.getElementById("total-spesen").textContent = spesenTotal.toFixed(2) + " €";

        saveData();
    }

    function toMin(t) {
        const [h,m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function toHHMM(min) {
        return (
            String(Math.floor(min / 60)).padStart(2, "0") +
            ":" +
            String(min % 60).padStart(2, "0")
        );
    }

    document.addEventListener("input", calcTime);

    // ====================================================
    // Unterschrift
    // ====================================================
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    let drawing = false;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
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

    document.getElementById("clear-signature").onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveData();
    };

    // ====================================================
    // Daten speichern
    // ====================================================
    function saveData() {
        const data = {
            kw: currentKW,
            fields: {}
        };

        document.querySelectorAll("input").forEach(inp => {
            data.fields[inp.id || inp.name] = inp.value;
        });

        data.signature = canvas.toDataURL();

        localStorage.setItem("wochenbericht", JSON.stringify(data));
    }

    // ====================================================
    // Laden / Reset
    // ====================================================
    function loadOrReset() {
        const saved = JSON.parse(localStorage.getItem("wochenbericht") || "{}");

        if (!saved.kw || saved.kw !== currentKW) {
            console.log("Neue Woche erkannt → Reset");

            // Alles löschen
            document.querySelectorAll("input").forEach(inp => inp.value = "");
            document.getElementById("total-hours").textContent = "00:00";
            document.getElementById("total-spesen").textContent = "0,00 €";
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            localStorage.removeItem("wochenbericht");
            return;
        }

        // Daten laden
        for (const key in saved.fields) {
            const inp = document.querySelector(`[id='${key}'], [name='${key}']`);
            if (inp) inp.value = saved.fields[key];
        }

        if (saved.signature) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = saved.signature;
        }

        calcTime();
    }

    loadOrReset();

    // ====================================================
    // PDF per WhatsApp
    // ====================================================
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
            alert("PDF gespeichert – Gerät unterstützt kein direktes WhatsApp-Sharing.");
        }
    };

});

