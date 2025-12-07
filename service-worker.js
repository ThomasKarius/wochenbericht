<script>
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/wochenbericht/service-worker.js")
        .then(() => console.log("Service Worker installiert"))
        .catch(err => console.log("SW Fehler:", err));
    }
</script>

