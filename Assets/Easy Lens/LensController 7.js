// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent beatCanvas
//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent gestureLabel
//@input Component.AudioComponent snare
//@input Component.AudioComponent beat
//@input Component.AudioComponent scratch
//@input Component.AudioComponent hihat


try {

// Gesture-driven Beat Visuals (no audio) using Hand Tracking + Canvas API

// ============================
// State
// ============================
let canvas = null;

// Hand positions (unit space 0..1)
let leftPos = null;  // vec2
let rightPos = null; // vec2

// Scratch state (unified pinch toggle across hands)
let scratchActive = false; // single flag
let scratchHand = null;    // 'L' | 'R' | null
let scratchTrail = []; // array of {p:vec2, v:vec2, life:number, maxLife:number}

// Beat pulse rings
let rings = []; // {p:vec2, r:number, vr:number, life:number, maxLife:number, col:vec3}

// Snare flash
let flash = 0; // 0..1

// Hi-hat ticks
let ticks = []; // {p:vec2, v:vec2, life:number, maxLife:number}

// Particles cap
const MAX_PARTICLES = 120;

// Label control (single Text block) with cooldown
let labelTimer = 0;
const LABEL_SHOW = 0.6; // visible duration
let labelCooldown = 0;  // minimal gap to avoid flicker
const LABEL_COOLDOWN_MIN = 0.15;

// Help text duration when tapping
const HELP_TIME = 1.5;

// ============================
// Utilities
// ============================
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function safeSetLabel(text) {
    // Enforce minimal cooldown to prevent rapid overlap/flicker
    if (labelCooldown > 0 && script.gestureLabel.enabled) {
        // If currently showing, just refresh timer without changing quickly
        labelTimer = LABEL_SHOW;
        return;
    }
    script.gestureLabel.text = text;
    script.gestureLabel.enabled = true;
    script.gestureLabel.forceSafeRegion(true);
    labelTimer = LABEL_SHOW;
    labelCooldown = LABEL_COOLDOWN_MIN;
}

function stablePos2D(data) {
    if (data && data.joints && data.joints.index3 && data.joints.index3.position2D) {
        return data.joints.index3.position2D;
    }
    if (data && data.position2D) { return data.position2D; }
    return null;
}

function spawnRing(p, color) {
    if (!p) return;
    if (rings.length + ticks.length + scratchTrail.length > MAX_PARTICLES) return;
    rings.push({ p: p, r: 0.02, vr: 0.6, life: 0.4, maxLife: 0.4, col: color });
}

function spawnTicksAround(p, count) {
    if (!p) return;
    for (let i = 0; i < count && (rings.length + ticks.length + scratchTrail.length) < MAX_PARTICLES; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.4 + Math.random() * 0.6;
        const v = new vec2(Math.cos(a) * sp, Math.sin(a) * sp);
        ticks.push({ p: new vec2(p.x, p.y), v: v, life: 0.25 + Math.random() * 0.2, maxLife: 0.45 });
    }
}

function addScratchPoint(p) {
    if (!p) return;
    if (rings.length + ticks.length + scratchTrail.length >= MAX_PARTICLES) return;
    const dir = MathUtils.randomRange(-1, 1);
    const v = new vec2(dir * 0.2, (Math.random() - 0.5) * 0.2);
    scratchTrail.push({ p: new vec2(p.x, p.y), v: v, life: 0.18, maxLife: 0.18 });
}

function clearAll() {
    rings.length = 0;
    ticks.length = 0;
    scratchTrail.length = 0;
    flash = 0;
}

// ============================
// Triggers
// ============================
function triggerBeatPulse(atPos) {
    spawnRing(atPos, new vec3(255, 255, 255));
    safeSetLabel("BEAT");
    script.beat.play(1);
}

function triggerScratch(hand) {
    safeSetLabel("SCRATCH");
    script.scratch.play(1);
}

function triggerSnare(atPos) {
    flash = 1.0;
    // central burst
    spawnTicksAround(atPos, 10);
    safeSetLabel("SNARE");
    script.snare.play(1);
}

function triggerHiHat(atPos) {
    spawnTicksAround(atPos, 12);
    safeSetLabel("HI-HAT");
    script.hihat.play(1);
}

// ============================
// Rendering (Canvas)
// ============================
function draw(dt) {
    if (!canvas) return;
    const w = canvas.getWidth();
    const h = canvas.getHeight();

    // Transparent background
    canvas.background(0, 0, 0, 0);

    // Fullscreen flash for snare
    if (flash > 0) {
        const a = Math.floor(180 * flash);
        canvas.noStroke();
        canvas.fill(255, 255, 255, a);
        canvas.rect(0, 0, w, h, 0);
        flash = Math.max(0, flash - dt * 6.0);
    }

    // Update and draw rings
    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life -= dt;
        r.r += r.vr * dt;
        const alpha = clamp01(r.life / r.maxLife);
        const px = r.p.x * w;
        const py = r.p.y * h;
        canvas.noFill();
        canvas.stroke(r.col.x, r.col.y, r.col.z, 220 * alpha);
        canvas.strokeWeight(6 * alpha + 2);
        canvas.circle(px, py, r.r * Math.min(w, h));
        if (r.life <= 0) { rings.splice(i, 1); }
    }

    // Update and draw ticks (hi-hat)
    for (let i = ticks.length - 1; i >= 0; i--) {
        const t = ticks[i];
        t.life -= dt;
        t.p = t.p.add(t.v.uniformScale(dt));
        const alpha = clamp01(t.life / t.maxLife);
        const px = t.p.x * w;
        const py = t.p.y * h;
        canvas.noFill();
        canvas.stroke(0, 255, 255, 220 * alpha);
        canvas.strokeWeight(2);
        canvas.line(px - 4, py, px + 4, py);
        canvas.line(px, py - 4, px, py + 4);
        if (t.life <= 0) { ticks.splice(i, 1); }
    }

    // Update and draw scratch trail (zig/curve)
    for (let i = scratchTrail.length - 1; i >= 0; i--) {
        const s = scratchTrail[i];
        s.life -= dt;
        s.p = s.p.add(s.v.uniformScale(dt));
        const alpha = clamp01(s.life / s.maxLife);
        const px = s.p.x * w;
        const py = s.p.y * h;
        canvas.noFill();
        canvas.stroke(255, 0, 180, 200 * alpha);
        canvas.strokeWeight(3);
        const off = 10 * Math.sin((1 - alpha) * 20);
        canvas.line(px - off, py - 4, px + off, py + 4);
        if (s.life <= 0) { scratchTrail.splice(i, 1); }
    }
}

// ============================
// Update Loop
// ============================
function update() {
    const dt = getDeltaTime ? getDeltaTime() : 0.016;

    // Label timers
    if (labelTimer > 0) {
        labelTimer = Math.max(0, labelTimer - dt);
        if (labelTimer === 0) { script.gestureLabel.enabled = false; }
    }
    if (labelCooldown > 0) { labelCooldown = Math.max(0, labelCooldown - dt); }

    // While scratching, emit short-lived segments from the active hand only
    if (scratchActive) {
        if (scratchHand === 'L' && leftPos) { addScratchPoint(leftPos); }
        else if (scratchHand === 'R' && rightPos) { addScratchPoint(rightPos); }
    }

    // Draw
    draw(dt);
}

// ============================
// Hand Tracking - Gesture Events
// ============================
// Map gestures for BOTH hands
script.handTracking.onLeftThumbUp.add(function() { 
    if (leftPos) 
        triggerBeatPulse(leftPos); 
});
script.handTracking.onRightThumbUp.add(function() {
    if (rightPos) 
        triggerBeatPulse(rightPos); 
});

script.handTracking.onLeftPinchDown.add(function() { 
    if (leftPos) 
        triggerScratch(leftPos); 
});
script.handTracking.onRightPinchDown.add(function() { 
    if (rightPos) 
        triggerScratch(rightPos); 
});

script.handTracking.onLeftFistClosed.add(function() {
    if (leftPos) 
        triggerSnare(leftPos); 
});
script.handTracking.onRightFistClosed.add(function() { 
    if (rightPos) 
        triggerSnare(rightPos); 
});

script.handTracking.onLeftPeace.add(function() { 
    if (leftPos) 
        triggerHiHat(leftPos); 
});
script.handTracking.onRightPeace.add(function() { 
    if (rightPos) 
        triggerHiHat(rightPos); 
});

// ============================
// Hand Tracking - Continuous Tracking
// ============================
script.handTracking.onLeftTracking.add(function(data) {
    const p = stablePos2D(data);
    if (p) { leftPos = p; }
});

script.handTracking.onRightTracking.add(function(data) {
    const p = stablePos2D(data);
    if (p) { rightPos = p; }
});

// ============================
// Touch Events (Tap to reset/help)
// ============================
script.touchEvents.onTap.add(function(x, y) {
    clearAll();
    safeSetLabel("👍 BEAT  🤏 PINCH = SCRATCH (toggle)\n✊ SNARE  ✌️ HI-HAT");
    labelTimer = HELP_TIME; // override show time for help
});

// ============================
// Initialization (On Start)
// ============================
script.createEvent("OnStartEvent").bind(function() {
    // Create full-screen canvas (onscreen)
    canvas = script.beatCanvas.createOnScreenCanvas();

    // Ensure label starts hidden
    script.gestureLabel.enabled = false;
    script.gestureLabel.forceSafeRegion(true);

    // Begin update loop
    const updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(update);
});

} catch(e) {
  print("error in controller");
  print(e);
}
