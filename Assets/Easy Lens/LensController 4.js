// Main Controller
//
// Made with Easy Lens

<<<<<<< HEAD
//@input Component.ScriptComponent canvas
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent raveNeonOverlay
//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent cyberpunkGrade
//@input Component.ScriptComponent scratchBg
//@input Component.ScriptComponent gestureLabel
//@input Component.ScriptComponent musicNoteParticles
//@input Component.AudioComponent beatAudio
//@input Component.AudioComponent airhornAudio

try {

// Gesture-Driven Virtual DJ Booth (visual simulation version - no audio blocks available)

// State
let isPlaying = false;
let modeText = "READY";
let useRightHand = true; // prefer right when available
let lastHandPos = new vec2(0.5, 0.5); // normalized [0..1]
let controllerOffset = new vec2(0, 0); // pixel offset, tap to reset
let scratchActive = false;
let fingerYNorm = 0.5; // 0..1 from fingertip.y for filter/slider
let screenSize;
let controllerSprite = null;
let controllerCanvas = null;
let controllerSize; // vec2 in pixels
let shakeTime = 0;
let shakeDuration = 0.25;
let shakeIntensityPx = 18; // pixels amplitude
let currentDeckHue = 180; // cyan/green hue base (hsb hue 0-360)
let deckHueTarget = 180;
let glowIntensity = 0.6; // 0..1 visual energy
let crossfaderPos = 0.5; // 0..1

// Utility: HSB to RGB (0-255 components)
function hsbToRgb(h, s, b) {
    let c = b * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = b - c;
    let r = 0, g = 0, bl = 0;
    if (0 <= h && h < 60) { r = c; g = x; bl = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; bl = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; bl = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; bl = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; bl = c; }
    else { r = c; g = 0; bl = x; }
    return new vec3((r + m) * 255, (g + m) * 255, (bl + m) * 255);
}

// Utility: HSB to normalized RGBA (0..1), alpha=1 by default
function hsbToRgba01(h, s, b, a) {
    let c = b * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = b - c;
    let r = 0, g = 0, bl = 0;
    if (0 <= h && h < 60) { r = c; g = x; bl = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; bl = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; bl = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; bl = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; bl = c; }
    else { r = c; g = 0; bl = x; }
    const rr = r + m;
    const gg = g + m;
    const bb = bl + m;
    const aa = (a === undefined) ? 1.0 : a;
    return new vec4(rr, gg, bb, aa);
}

// Draw controller (two decks + crossfader) on controllerCanvas
function drawController() {
    if (!controllerCanvas) return;
    const w = controllerCanvas.getWidth();
    const h = controllerCanvas.getHeight();

    controllerCanvas.background(0, 0, 0, 0);

    // Neon style base panel
    controllerCanvas.noFill();
    controllerCanvas.stroke(40, 255, 255, 160);
    controllerCanvas.strokeWeight(Math.max(2, Math.floor(Math.min(w, h) * 0.006)));
    controllerCanvas.rect(0, 0, w, h, 22);

    // Decks positions
    const pad = Math.min(w, h) * 0.08;
    const deckRadius = Math.min(w, h) * 0.25;
    const leftCenter = new vec2(pad + deckRadius, h * 0.5);
    const rightCenter = new vec2(w - pad - deckRadius, h * 0.5);

    // Colors based on hue/intensity
    const hue = currentDeckHue;
    const base = hsbToRgb(hue, 1, MathUtils.clamp(0.35 + glowIntensity * 0.6, 0, 1));
    const glow = hsbToRgb(hue, 1, MathUtils.clamp(0.85 + glowIntensity * 0.15, 0, 1));

    // Deck glow rings
    controllerCanvas.noFill();
    controllerCanvas.blendMode('add');
    for (let i = 0; i < 4; i++) {
        const alpha = 110 - i * 22;
        const r = deckRadius + i * (deckRadius * 0.12);
        controllerCanvas.stroke(glow.x, glow.y, glow.z, alpha);
        controllerCanvas.strokeWeight(Math.max(2, Math.floor(r * 0.08)));
        controllerCanvas.circle(leftCenter.x, leftCenter.y, r * 2);
        controllerCanvas.circle(rightCenter.x, rightCenter.y, r * 2);
    }

    // Deck core
    controllerCanvas.fill(base.x, base.y, base.z, 220);
    controllerCanvas.noStroke();
    controllerCanvas.circle(leftCenter.x, leftCenter.y, deckRadius * 1.5);
    controllerCanvas.circle(rightCenter.x, rightCenter.y, deckRadius * 1.5);

    // Spinning-style accents (visual energy)
    controllerCanvas.noFill();
    controllerCanvas.stroke(255, 255, 255, 70 + glowIntensity * 80);
    controllerCanvas.strokeWeight(Math.max(1, Math.floor(deckRadius * 0.06)));
    const ringR = deckRadius * (0.9 + 0.08 * Math.sin(Date.now() * 0.003));
    controllerCanvas.circle(leftCenter.x, leftCenter.y, ringR * 2);
    controllerCanvas.circle(rightCenter.x, rightCenter.y, ringR * 2);

    // Crossfader track
    const trackY = h * 0.82;
    const trackW = w * 0.6;
    const trackH = Math.max(6, Math.floor(h * 0.025));
    const trackX = (w - trackW) * 0.5;
    controllerCanvas.noFill();
    controllerCanvas.stroke(120, 255, 255, 140);
    controllerCanvas.strokeWeight(Math.max(2, Math.floor(trackH * 0.6)));
    controllerCanvas.rect(trackX, trackY - trackH * 0.5, trackW, trackH, trackH * 0.5);

    // Crossfader knob based on crossfaderPos
    const knobX = trackX + crossfaderPos * trackW;
    const knobW = Math.max(14, Math.floor(trackW * 0.06));
    const knobH = Math.max(24, Math.floor(trackH * 2.1));
    controllerCanvas.fill(glow.x, glow.y, glow.z, 230);
    controllerCanvas.noStroke();
    controllerCanvas.rect(knobX - knobW * 0.5, trackY - knobH * 0.5, knobW, knobH, knobW * 0.2);

    // Status LED strip (turn red on STOP)
    if (!isPlaying) {
        controllerCanvas.fill(255, 50, 60, 220);
    } else {
        controllerCanvas.fill(glow.x, glow.y, glow.z, 220);
    }
    const ledW = Math.max(10, Math.floor(w * 0.05));
    const ledH = Math.max(10, Math.floor(h * 0.02));
    controllerCanvas.rect(w * 0.5 - ledW * 0.5, h * 0.08 - ledH * 0.5, ledW, ledH, ledH * 0.4);

    // Title accent
    controllerCanvas.noFill();
    controllerCanvas.stroke(base.x, base.y, base.z, 140);
    controllerCanvas.strokeWeight(2);
    controllerCanvas.triangle(w * 0.48, h * 0.07, w * 0.52, h * 0.07, w * 0.5, h * 0.11);

    // Restore blend mode
    controllerCanvas.blendMode('normal');
}

// Update gesture label text safely
function updateLabel() {
    script.gestureLabel.text = modeText;
    script.gestureLabel.forceSafeRegion(true);
}

// Set visual mode helpers
function setPlayMode() {
    isPlaying = true;
    modeText = "PLAY MODE";
    deckHueTarget = 180; // cyan/green
    glowIntensity = 0.8;
    updateLabel();
}

function setScratchMode() {
    isPlaying = true;
    scratchActive = true;
    modeText = "SCRATCH MODE";
    updateLabel();
}

function setStopMode() {
    isPlaying = false;
    scratchActive = false;
    modeText = "STOP";
    deckHueTarget = 0; // red
    glowIntensity = 0.5;
    updateLabel();
}

// Trigger short screen shake and temporary airhorn hit mode text
function triggerAirhornHit() {
    const prevText = modeText;
    modeText = "SNARE";
    updateLabel();

    shakeTime = shakeDuration;

    const dcb = script.createEvent("DelayedCallbackEvent");
    dcb.bind(function () {
        modeText = isPlaying ? (scratchActive ? "SCRATCH MODE" : "PLAY MODE") : "STOP";
        updateLabel();
    });
    dcb.reset(0.3);
}

// Apply particle toggle based on isPlaying
function updateParticles() {
    script.musicNoteParticles.enabled = isPlaying;
}

// Update deck hue and glow for scratch mapping
function updateScratchMapping() {
    if (!scratchActive) {
        return;
    }
    // Dramatic red↔blue mapping driven by fingertip Y
    // fingerYNorm: 0 (top) -> 1 (bottom); invert so inv=1 when pointing up
    const inv = 1 - fingerYNorm;
    // Map hue from blue (~220°) at inv=0 to red (~0°) at inv=1
    deckHueTarget = MathUtils.lerp(220, 0, inv);
    // Stronger glow when pointing up
    glowIntensity = 0.55 + inv * 0.45; // 0.55..1.0
    crossfaderPos = MathUtils.clamp(inv, 0, 1);
}

// Smoothly approach hue target
function dampHue(dt) {
    const diff = ((deckHueTarget - currentDeckHue + 540) % 360) - 180; // shortest arc
    const speed = 220; // deg/sec
    const step = MathUtils.clamp(diff, -speed * dt, speed * dt);
    currentDeckHue = (currentDeckHue + step + 360) % 360;
}

// Update loop
function onUpdate() {
    const dt = getDeltaTime();

    // Prefer right hand when visible; position updates come from tracking callbacks storing lastHandPos
    let targetPosPixels = lastHandPos.mult(screenSize); // pixel
    let shakeOffset = new vec2(0, 0);
    if (shakeTime > 0) {
        shakeTime -= dt;
        const t = Math.max(0, shakeTime) / shakeDuration;
        // Diminishing shake
        const amp = shakeIntensityPx * t * t;
        shakeOffset = new vec2(
            (Math.random() * 2 - 1) * amp,
            (Math.random() * 2 - 1) * amp
        );
    }

    // Scratch mapping updates visuals
    updateScratchMapping();

    // Smooth hue
    dampHue(dt);

    // Redraw controller (dynamic)
    drawController();

    // Drive background gradient to match deck hue in Scratch Mode
    if (script.scratchBg) {
        if (scratchActive) {
            const h1 = currentDeckHue;
            const h2 = (currentDeckHue + 20) % 360; // small offset for gradient separation
            // Push saturation and brightness for a bolder look during scratch
            const c1 = hsbToRgba01(h1, 1.0, 0.75, 1.0);
            const c3 = hsbToRgba01(h2, 1.0, 0.75, 1.0);
            script.scratchBg.color1 = c1;
            script.scratchBg.color3 = c3;
        } else {
            // Stable cyber-cyan gradient when not scratching
            const c1 = hsbToRgba01(180, 0.65, 0.5, 1.0); // teal
            const c3 = hsbToRgba01(200, 0.65, 0.5, 1.0); // blue-teal
            script.scratchBg.color1 = c1;
            script.scratchBg.color3 = c3;
        }
    }

    // Update sprite transform (position)
    if (controllerSprite) {
        const finalPos = targetPosPixels.add(controllerOffset).add(shakeOffset);
        controllerSprite.position = finalPos;
    }

    // Toggle particles
    updateParticles();
}

// Hand tracking handlers
function onRightTrack(data) {
    useRightHand = true;
    lastHandPos = data.position2D;
    if (scratchActive && data.joints && data.joints.index3 && data.joints.index3.position2D) {
        const y = data.joints.index3.position2D.y;
        fingerYNorm = MathUtils.clamp(y, 0, 1);
    }
}

function onLeftTrack(data) {
    if (!useRightHand) {
        lastHandPos = data.position2D;
        if (scratchActive && data.joints && data.joints.index3 && data.joints.index3.position2D) {
            const y = data.joints.index3.position2D.y;
            fingerYNorm = MathUtils.clamp(y, 0, 1);
        }
    }
}

// Visibility toggle between hands to prefer right hand when present
script.handTracking.onRightHandShown.add(function () {
    useRightHand = true;
});
script.handTracking.onRightHandHidden.add(function () {
    useRightHand = false;
});

// Gesture bindings
script.handTracking.onLeftPalmOpen.add(function () {
    setPlayMode();
    if (script.beatAudio) {
        script.beatAudio.loop = true;
        script.beatAudio.play(-1); // -1 = loop forever
    }
});
script.handTracking.onRightPalmOpen.add(function () {
    setPlayMode();
    if (script.beatAudio) {
        script.beatAudio.loop = true;
        script.beatAudio.play(-1); // -1 = loop forever
    }
});

script.handTracking.onLeftPeace.add(function () {
    triggerAirhornHit();
    if (script.airhornAudio) {
        script.airhornAudio.play(1); // play once
    }
});
script.handTracking.onRightPeace.add(function () {
    triggerAirhornHit();
    if (script.airhornAudio) {
        script.airhornAudio.play(1); // play once
    }
});

script.handTracking.onLeftPoint.add(function () {
    setScratchMode();
});
script.handTracking.onRightPoint.add(function () {
    setScratchMode();
});

script.handTracking.onLeftFistClosed.add(function () {
    if (script.beatAudio) {
        script.beatAudio.stop(1);
    }
    if (script.airhornAudio) {
        script.airhornAudio.stop(1);
    }
    setStopMode();
});
script.handTracking.onRightFistClosed.add(function () {
    if (script.beatAudio) {
        script.beatAudio.stop(1);
    }
    if (script.airhornAudio) {
        script.airhornAudio.stop(1);
    }
    setStopMode();
});

// Tracking data updates
script.handTracking.onRightTracking.add(function (data) {
    onRightTrack(data);
});
script.handTracking.onLeftTracking.add(function (data) {
    onLeftTrack(data);
});

// Touch to recalibrate/reset offset and clear shake
script.touchEvents.onTap.add(function (x, y) {
    if (!controllerSprite) return;
    const tapPixel = script.spriteManager.unitToPixel(new vec2(x, y));
    // New offset so controller centers on tap
    const spritePos = controllerSprite.position;
    controllerOffset = tapPixel.sub(lastHandPos.mult(screenSize));
    shakeTime = 0; // clear residual shake
});

// On Start: initialize canvases, sprites, post adjust, particles, label
script.createEvent("OnStartEvent").bind(function () {
    screenSize = script.spriteManager.getScreenSize();

    // Create controller canvas and sprite
    const baseWidth = Math.floor(screenSize.x * 0.6);
    const baseHeight = Math.floor(screenSize.y * 0.35);
    controllerCanvas = script.canvas.createCanvas(baseWidth, baseHeight);
    controllerSize = new vec2(baseWidth, baseHeight);

    controllerSprite = script.spriteManager.createSprite("DJController");
    controllerSprite.texture = controllerCanvas.getTexture();
    controllerSprite.size = controllerSize;
    controllerSprite.position = screenSize.mult(new vec2(0.5, 0.6)); // initial placement
    controllerSprite.zIndex = 10;

    // Initial draw
    drawController();

    // Ensure background block is in gradient mode with two colors (runtime only, no static init)
    if (script.scratchBg) {
        // Only set dynamic visuals; avoid overriding designer choices beyond what's needed
        // We rely on fillMode/gradientMode set in UI. If not, we still update colors.
        // Initialize to non-scratch stable look
        const c1 = hsbToRgba01(180, 0.65, 0.5, 1.0);
        const c3 = hsbToRgba01(200, 0.65, 0.5, 1.0);
        script.scratchBg.color1 = c1;
        script.scratchBg.color3 = c3;
    }

    // Neon overlay: keep subtle and always enabled; designer tunes visuals in block UI
    if (script.raveNeonOverlay) {
        script.raveNeonOverlay.enabled = true;
    }

    // Particles default off until play
    script.musicNoteParticles.enabled = false;

    // Label initial
    updateLabel();

    // Begin update loop
    const upd = script.createEvent("UpdateEvent");
    upd.bind(onUpdate);
=======
//@input Component.ScriptComponent beatCanvas
//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent gestureLabel


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
}

function startScratch(hand) {
    if (!scratchActive) {
        scratchActive = true;
        scratchHand = hand; // 'L' or 'R'
        safeSetLabel("SCRATCH");
    }
}

function endScratch(hand) {
    if (scratchActive && scratchHand === hand) {
        scratchActive = false;
        scratchHand = null;
    }
}

function triggerSnare(atPos) {
    flash = 1.0;
    // central burst
    spawnTicksAround(atPos, 10);
    safeSetLabel("SNARE");
}

function triggerHiHat(atPos) {
    spawnTicksAround(atPos, 12);
    safeSetLabel("HI-HAT");
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
    // Consolidated pinch: toggle scratch for left hand
    if (!scratchActive) { scratchActive = true; scratchHand = 'L'; safeSetLabel("SCRATCH"); }
    else if (scratchHand === 'L') { scratchActive = false; scratchHand = null; }
    // If active on 'R', ignore
});
script.handTracking.onRightPinchDown.add(function() { 
    // Consolidated pinch: toggle scratch for right hand
    if (!scratchActive) { scratchActive = true; scratchHand = 'R'; safeSetLabel("SCRATCH"); }
    else if (scratchHand === 'R') { scratchActive = false; scratchHand = null; }
    // If active on 'L', ignore
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
>>>>>>> 0afe76945d4a803c6fd4cc0c4b71ee87d3cde86a
});

} catch(e) {
  print("error in controller");
  print(e);
}
