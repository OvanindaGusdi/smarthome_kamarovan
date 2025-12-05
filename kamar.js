// =====================================
// UTILITY
// =====================================
function dbToBool(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === "boolean") return v ? 1 : 0;

    const n = Number(v);
    if (!Number.isNaN(n)) return n ? 1 : 0;

    if (String(v).toLowerCase() === "true") return 1;
    return 0;
}


// =====================================
// SYNC LAMPU
// =====================================
function syncLamp(id, value) {
    const img = document.getElementById(`lamp${id}_img`);
    const btn = document.getElementById(`lamp${id}_btn`);
    const v = dbToBool(value);

    if (!img || !btn) return;

    if (v === 1) {
        img.src = "lamp_on.png";
        img.classList.add("lamp-on");
        btn.classList.add("on");
        btn.classList.remove("off");
        btn.innerText = "ON";
    } else {
        img.src = "lamp_off.png";
        img.classList.remove("lamp-on");
        btn.classList.add("off");
        btn.classList.remove("on");
        btn.innerText = "OFF";
    }
}


// =====================================
// SYNC KIPAS
// =====================================
function syncFan(value) {
    const img = document.getElementById("fan_img");
    const btn = document.getElementById("fan_btn");
    const v = dbToBool(value);

    if (!img || !btn) return;

    if (v === 1) {
        img.src = "fan_on.png";
        img.classList.add("fan-on");
        btn.classList.add("on");
        btn.classList.remove("off");
        btn.innerText = "ON";
    } else {
        img.src = "fan_off.png";
        img.classList.remove("fan-on");
        btn.classList.add("off");
        btn.classList.remove("on");
        btn.innerText = "OFF";
    }
}


// =====================================
// TOGGLE FUNCTIONS
// =====================================
function toggleLamp(id) {
    const btn = document.getElementById(`lamp${id}_btn`);
    if (!btn) return;

    const newState = btn.classList.contains("on") ? 0 : 1;

    // Optimistic UI
    syncLamp(id, newState);

    try {
        setDB(refDB(db, `kamar_ovan/lamp${id}`), newState);
    } catch (e) {
        console.error("setDB error:", e);
    }
}

function toggleFan() {
    const btn = document.getElementById("fan_btn");
    if (!btn) return;

    const newState = btn.classList.contains("on") ? 0 : 1;

    syncFan(newState);

    try {
        setDB(refDB(db, "kamar_ovan/fan"), newState);
    } catch (e) {
        console.error("setDB error:", e);
    }
}



// =====================================
// EXECUTE SETELAH DOM SIAP
// =====================================
window.addEventListener("DOMContentLoaded", () => {

    // Safety checks
    if (!window.refDB || !window.setDB || !window.onValueDB || !window.db) {
        console.error("Firebase helpers not loaded!");
        return;
    }

    console.log("kamar.js loaded: attaching Firebase listeners...");

    // ------------------------
    // LISTENER UTAMA (lamp & kipas)
    // ------------------------
    onValueDB(refDB(db, "kamar_ovan"), (snap) => {
        if (!snap.exists()) return;
        const d = snap.val();

        if (d.lamp1 !== undefined) syncLamp(1, d.lamp1);
        if (d.lamp3 !== undefined) syncLamp(3, d.lamp3);
        if (d.lamp4 !== undefined) syncLamp(4, d.lamp4);

        if (d.fan !== undefined) syncFan(d.fan);
    });



    // ------------------------
    // LISTENER SENSOR DHT22
    // ------------------------
    onValueDB(refDB(db, "kamar_ovan/dht22"), (snap) => {
        if (!snap.exists()) return;

        const d = snap.val();

document.getElementById("temp-text").innerText =
    (d.temperature ?? "--") + "°C";

document.getElementById("humidity-text").innerText =
    (d.humidity ?? "--") + "%";

    });



    // ------------------------
    // LISTENER SENSOR PZEM
    // ------------------------
    onValueDB(refDB(db, "kamar_ovan/pzem"), (snap) => {
        if (!snap.exists()) return;

        const p = snap.val();

document.getElementById("voltage-text").innerText = (p.voltage ?? "--") + " V";
document.getElementById("current-text").innerText = (p.current ?? "--") + " A";
document.getElementById("power-text").innerText = (p.power ?? "--") + " W";
document.getElementById("energy-text").innerText = (p.energy ?? "--") + " kWh";
document.getElementById("frequency-text").innerText = (p.frequency ?? "--") + " Hz";
document.getElementById("pf-text").innerText = (p.pf ?? "--");

    });



    // ------------------------
    // REGISTER BUTTONS (backup)
    // ------------------------
    const btn1 = document.getElementById("lamp1_btn");
    const btn3 = document.getElementById("lamp3_btn");
    const btn4 = document.getElementById("lamp4_btn");
    const fanBtn = document.getElementById("fan_btn");

    if (btn1) btn1.onclick = () => toggleLamp(1);
    if (btn3) btn3.onclick = () => toggleLamp(3);
    if (btn4) btn4.onclick = () => toggleLamp(4);
    if (fanBtn) fanBtn.onclick = toggleFan;
});


