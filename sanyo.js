// =====================================
// VARIABEL
// =====================================
let countdown = null;
let targetTime = 0;   // disimpan dari Firebase

// =====================================
// UPDATE UI TIMER
// =====================================
function updateTimerUI(timer) {

    // Cegah NaN tampil
    if (timer === undefined || timer === null || isNaN(timer)) {
        document.getElementById("timerDisplay").innerText = "00:00";
        return;
    }

    let m = Math.floor(timer / 60);
    let s = Math.floor(timer % 60);

    if (isNaN(m) || isNaN(s)) {
        document.getElementById("timerDisplay").innerText = "00:00";
        return;
    }

    document.getElementById("timerDisplay").innerText =
        `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


// =====================================
// UPDATE STATUS UI
// =====================================
function updateUI(status, mode, timer) {
    const statusText = document.getElementById("statusText");
    const pumpImg = document.getElementById("pumpImg");

    statusText.innerText = status.toUpperCase();

    // Tetap mempertahankan efek sebelumnya
    pumpImg.classList.toggle("pump-on", status === "on");

    // Tambahkan perubahan gambar (TIDAK ganggu efek)
    if (status === "on") {
        pumpImg.src = "sanyo_on.png";
    } else {
        pumpImg.src = "sanyo_off.png";
    }

    updateTimerUI(timer);
    timerRunning = (mode === "timer");
}



// =====================================
// LISTENER FIREBASE
// =====================================
firebase.database().ref("waterpump").on("value", snap => {

    if (!snap.exists()) return;

    const data = snap.val();

    updateUI(data.status);
    targetTime = data.target ?? 0;

    // Hapus interval jika ada
    clearInterval(countdown);
    countdown = null;

    if (data.mode === "timer" && targetTime > 0) {

        countdown = setInterval(() => {
            let now = Math.floor(Date.now() / 1000);
            let timeLeft = targetTime - now;

            updateTimerUI(timeLeft);

            // Jika habis
            if (timeLeft <= 0) {
                clearInterval(countdown);
                pumpOff(); // auto OFF
            }

        }, 1000);

    } else {
        // Mode manual → tampilkan 00:00
        updateTimerUI(0);
    }
});



// =====================================
// FUNGSI: ON MANUAL
// =====================================
function pumpOn() {
    clearInterval(countdown);

    firebase.database().ref("waterpump").update({
        status: "on",
        mode: "manual",
        target: 0
    });
}



// =====================================
// FUNGSI: OFF TOTAL
// =====================================
function pumpOff() {
    clearInterval(countdown);

    firebase.database().ref("waterpump").update({
        status: "off",
        mode: "manual",
        target: 0
    });

    updateTimerUI(0);
}



// =====================================
// FUNGSI: MULAI TIMER
// =====================================
function startTimer() {
    let minutes = parseInt(document.getElementById("timerInput").value);

    if (!minutes || minutes <= 0) {
        alert("Masukkan waktu dalam menit!");
        return;
    }

    let now = Math.floor(Date.now() / 1000);
    let target = now + (minutes * 60); // Waktu selesai


    firebase.database().ref("waterpump").update({
        status: "on",
        mode: "timer",
        target: target
    });
}
