// kamar.js
// Full script: lamp/fan control + Firebase listeners + smooth gauge needles

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
// GAUGE HELPERS
// =====================================
// map value to angle (-90 .. +90)
function valueToAngle(value, min, max) {
    let v = Number(value);
    if (isNaN(v)) v = min;
    if (v < min) v = min;
    if (v > max) v = max;
    // fraction 0..1 then map to -90..+90
    const frac = (v - min) / (max - min);
    return (frac * 180) - 90;
}

// update needle element rotation and text
function updateNeedle(needleId, textId, value, min, max, unit = "") {
    const needle = document.getElementById(needleId);
    const textEl = document.getElementById(textId);
    // set text
    if (textEl) {
        if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
            textEl.innerText = `--${unit}`;
        } else {
            // format numbers nicely: integer for many, 1 decimal for floats
            const num = Number(value);
            const txt = (Math.abs(num) >= 100 || Number.isInteger(num)) ? num.toString() : num.toFixed(1);
            textEl.innerText = `${txt}${unit}`;
        }
    }
    if (!needle) return;
    const angle = valueToAngle(value ?? min, min, max);
    // preserve translateX(-50%), apply rotation
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
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
    // optimistic UI
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
// DOM READY: attach Firebase listeners
// =====================================
window.addEventListener("DOMContentLoaded", () => {

    // Safety checks for firebase helpers (in your HTML module script we set window.db/refDB/etc)
    if (!window.refDB || !window.setDB || !window.onValueDB || !window.db) {
        console.error("Firebase helpers not loaded!");
        return;
    }

    console.log("kamar.js loaded: attaching Firebase listeners...");

    // --- Register button handlers (backup)
    const btn1 = document.getElementById("lamp1_btn");
    const btn3 = document.getElementById("lamp3_btn");
    const btn4 = document.getElementById("lamp4_btn");
    const fanBtn = document.getElementById("fan_btn");

    if (btn1) btn1.onclick = () => toggleLamp(1);
    if (btn3) btn3.onclick = () => toggleLamp(3);
    if (btn4) btn4.onclick = () => toggleLamp(4);
    if (fanBtn) fanBtn.onclick = toggleFan;

    // ------------------------
    // MAIN LISTENER - LAMPU & KIPAS
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
    // LISTENER DHT22 (temp & humidity)
    // ------------------------
    onValueDB(refDB(db, "kamar_ovan/dht22"), (snap) => {
        if (!snap.exists()) return;
        const d = snap.val();
        const t = (d.temperature === undefined) ? null : Number(d.temperature);
        const h = (d.humidity === undefined) ? null : Number(d.humidity);

        // text
        const tempTextEl = document.getElementById("temp-text");
        const humTextEl = document.getElementById("humidity-text");
        if (tempTextEl) tempTextEl.innerText = (t === null || isNaN(t)) ? "--°C" : `${(Math.abs(t) >= 100 || Number.isInteger(t)) ? t : t.toFixed(1)}°C`;
        if (humTextEl)  humTextEl.innerText  = (h === null || isNaN(h)) ? "--%"  : `${(Math.abs(h) >= 100 || Number.isInteger(h)) ? h : h.toFixed(1)}%`;

        // update needles (ranges as requested)
        // Temperature range: -5 .. 50
        updateNeedle("temp-needle", "temp-text", t ?? -5, -5, 50, "°C");
        // Humidity range: 0 .. 100
        updateNeedle("humidity-needle", "humidity-text", h ?? 0, 0, 100, "%");
    });

    // ------------------------
    // LISTENER PZEM (voltage, current, power, energy, frequency, pf)
    // ------------------------
    onValueDB(refDB(db, "kamar_ovan/pzem"), (snap) => {
        if (!snap.exists()) return;
        const p = snap.val();

        const v = (p.voltage === undefined) ? null : Number(p.voltage);
        const i = (p.current === undefined) ? null : Number(p.current);
        const power = (p.power === undefined) ? null : Number(p.power);
        const energy = (p.energy === undefined) ? null : Number(p.energy);
        const freq = (p.frequency === undefined) ? null : Number(p.frequency);
        const pf = (p.pf === undefined) ? null : Number(p.pf);

        // update text displays (if elements exist)
        const vEl = document.getElementById("voltage-text");
        const iEl = document.getElementById("current-text");
        const pEl = document.getElementById("power-text");
        const eEl = document.getElementById("energy-text");
        const fEl = document.getElementById("frequency-text") || document.getElementById("freq-text");
        const pfEl = document.getElementById("pf-text");

        if (vEl) vEl.innerText = (v === null || isNaN(v)) ? "-- V" : `${(Number.isInteger(v) ? v : v.toFixed(1))} V`;
        if (iEl) iEl.innerText = (i === null || isNaN(i)) ? "-- A" : `${(Number.isInteger(i) ? i : i.toFixed(2))} A`;
        if (pEl) pEl.innerText = (power === null || isNaN(power)) ? "-- W" : `${(Number.isInteger(power) ? power : power.toFixed(1))} W`;
        if (eEl) eEl.innerText = (energy === null || isNaN(energy)) ? "-- kWh" : `${(Number.isInteger(energy) ? energy : energy.toFixed(3))} kWh`;
        if (fEl) fEl.innerText = (freq === null || isNaN(freq)) ? "-- Hz" : `${(Number.isInteger(freq) ? freq : freq.toFixed(2))} Hz`;
        if (pfEl) pfEl.innerText = (pf === null || isNaN(pf)) ? "--" : `${(Number.isInteger(pf) ? pf : pf.toFixed(2))}`;

        // update needles with requested ranges:
        // Voltage: 0 .. 500
        updateNeedle("voltage-needle", "voltage-text", v ?? 0, 0, 500, "V");
        // Current: 0 .. 100 (ampere)
        updateNeedle("current-needle", "current-text", i ?? 0, 0, 100, "A");
        // Optionally map power/energy to other needles if you create them
        // If you added gauge elements for power/energy, you can call updateNeedle similarly.
    });

    console.log("Firebase listeners attached and gauge update active.");
});
