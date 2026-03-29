// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent canvas
//@input Component.ScriptComponent gestureLabel
//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent cyberpunkGrade
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
    modeText = "AIRHORN HIT";
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
    // Map fingertip Y to hue shift and glow intensity and crossfader
    // fingerYNorm: 0 (top) -> 1 (bottom); invert for musical brightness feel
    const inv = 1 - fingerYNorm;
    deckHueTarget = 160 + inv * 60; // tilt between teal(160) and magenta-ish(220)
    glowIntensity = 0.45 + inv * 0.5; // 0.45..0.95
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

    // Post process vibe (only dynamic changes allowed; assume base values are set in the block UI)

    // Particles default off until play
    script.musicNoteParticles.enabled = false;

    // Label initial
    updateLabel();

    // Begin update loop
    const upd = script.createEvent("UpdateEvent");
    upd.bind(onUpdate);
});

} catch(e) {
  print("error in controller");
  print(e);
}
