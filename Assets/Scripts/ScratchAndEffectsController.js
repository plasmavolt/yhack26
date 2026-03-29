// ScratchAndEffectsController.js
// Merged Yolanda features into Karen's lens:
//   1. Scratch gesture (point) -> global volume control for all tracks
//   2. Color-cycling effect on the club background
//
// Uses global.HandTracking (Hand Joints Gesture) for gesture detection.
// The global.scratchVolume is consumed by AudioTrackExample.js

// @input SceneObject backgroundImage {"hint":"The Background Image scene object for color cycling"}

try {

// ============================================================
// GLOBAL SCRATCH VOLUME (consumed by AudioTrackExample.js)
// ============================================================
global.scratchVolume = 1.0;

// ============================================================
// CONSTANTS
// ============================================================
var EXTEND_COS_THRESHOLD = 0.38;
var VOL_MIN = 0.05;
var VOL_MAX = 1.0;
var VOL_SMOOTH_SPEED = 10.0;
var HUE_SPEED = 30;
var HUE_SPEED_SCRATCH = 120;

// ============================================================
// STATE
// ============================================================
var scratchActive = false;
var fingerYNorm = 0.5;
var currentVol = 1.0;
var targetVol = 1.0;
var currentHue = 0;
var bgMaterial = null;
var wasPointing = false;

// ============================================================
// HAND TRACKING GESTURE DETECTION
// ============================================================
function chainExtended(mcp, pip, tip) {
    var HT = global.HandTracking;
    if (!HT || !HT[mcp] || !HT[pip] || !HT[tip]) return false;
    if (!HT[mcp].isTracking() || !HT[pip].isTracking() || !HT[tip].isTracking()) return false;

    var p0 = HT[mcp].getWorldPosition();
    var p1 = HT[pip].getWorldPosition();
    var p2 = HT[tip].getWorldPosition();
    var v1 = p1.sub(p0);
    var v2 = p2.sub(p1);
    var l1 = v1.length;
    var l2 = v2.length;
    if (l1 < 1e-5 || l2 < 1e-5) return false;
    return v1.dot(v2) / (l1 * l2) > EXTEND_COS_THRESHOLD;
}

function fingerExtended(idx) {
    if (idx === 0) return chainExtended("Thumb0", "Thumb2", "Thumb3");
    if (idx === 1) return chainExtended("Index0", "Index2", "Index3");
    if (idx === 2) return chainExtended("Middle0", "Middle2", "Middle3");
    if (idx === 3) return chainExtended("Ring0", "Ring2", "Ring3");
    return chainExtended("Pinky0", "Pinky2", "Pinky3");
}

function handReady() {
    var HT = global.HandTracking;
    if (!HT) return false;
    var w = HT.Wrist && HT.Wrist.isTracking();
    var c = HT.Center && HT.Center.isTracking();
    return w || c;
}

// Detect "point" gesture: only index finger extended
function isPointing() {
    if (!handReady()) return false;
    return fingerExtended(1) && !fingerExtended(2) && !fingerExtended(3) && !fingerExtended(4);
}

// Get index fingertip Y for volume mapping
function getIndexFingerY() {
    var HT = global.HandTracking;
    if (!HT || !HT.Index3 || !HT.Index3.isTracking()) return 0.5;
    try {
        var wp = HT.Index3.getWorldPosition();
        var wristPos = (HT.Wrist && HT.Wrist.isTracking()) ? HT.Wrist.getWorldPosition() : null;
        if (wristPos) {
            // Use relative position to wrist for more stable mapping
            var relY = wp.y - wristPos.y;
            // relY typically ranges from -5 to 15 when pointing up/down
            return Math.max(0, Math.min(1, 0.5 - relY / 20));
        }
        // Fallback absolute mapping
        return Math.max(0, Math.min(1, 0.5 - wp.y / 60));
    } catch(e) {
        return 0.5;
    }
}

// ============================================================
// SCRATCH VOLUME
// ============================================================
function updateScratchVolume(dt) {
    if (scratchActive) {
        fingerYNorm = getIndexFingerY();
        targetVol = VOL_MIN + (1 - fingerYNorm) * (VOL_MAX - VOL_MIN);
    } else {
        targetVol = 1.0;
    }
    var diff = targetVol - currentVol;
    currentVol += diff * Math.min(1, VOL_SMOOTH_SPEED * dt);
    global.scratchVolume = currentVol;
}

// ============================================================
// BACKGROUND COLOR CYCLING
// ============================================================
function hsbToVec4(h, s, b) {
    h = ((h % 360) + 360) % 360;
    var c = b * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = b - c;
    var r = 0, g = 0, bl = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; bl = x; }
    else if (h < 240) { g = x; bl = c; }
    else if (h < 300) { r = x; bl = c; }
    else { r = c; bl = x; }
    return new vec4(r + m, g + m, bl + m, 1);
}

function updateBackgroundColor(dt) {
    var speed = scratchActive ? HUE_SPEED_SCRATCH : HUE_SPEED;
    currentHue = (currentHue + speed * dt) % 360;

    if (bgMaterial) {
        var col = hsbToVec4(currentHue, 0.7, 1.0);
        try { bgMaterial.mainPass.baseColor = col; } catch(e) {}
    }
}

// ============================================================
// MAIN UPDATE
// ============================================================
function onUpdate() {
    var dt = getDeltaTime ? getDeltaTime() : 0.016;

    var pointing = isPointing();

    // Edge detection for scratch toggle
    if (pointing && !wasPointing) {
        scratchActive = true;
    }
    if (!pointing && wasPointing) {
        scratchActive = false;
    }
    wasPointing = pointing;

    updateScratchVolume(dt);
    updateBackgroundColor(dt);
}

// ============================================================
// INITIALIZATION
// ============================================================
script.createEvent("OnStartEvent").bind(function() {
    // Grab background material for color cycling
    if (script.backgroundImage) {
        // Try Image component first (2D background)
        try {
            var img = script.backgroundImage.getComponent("Component.Image");
            if (img && img.mainMaterial) {
                bgMaterial = img.mainMaterial.clone();
                img.mainMaterial = bgMaterial;
                print("ColorCycle: Found background Image material");
            }
        } catch(e) {}

        // Try BaseMeshVisual/MeshVisual if Image didn't work
        if (!bgMaterial) {
            try {
                var mesh = script.backgroundImage.getComponent("Component.BaseMeshVisual");
                if (mesh && mesh.mainMaterial) {
                    bgMaterial = mesh.mainMaterial.clone();
                    mesh.mainMaterial = bgMaterial;
                    print("ColorCycle: Found background mesh material");
                }
            } catch(e2) {}
        }

        if (!bgMaterial) {
            print("ColorCycle: Warning - could not find background material. Color cycling disabled.");
        }
    } else {
        print("ColorCycle: No backgroundImage input set");
    }

    // Start update loop
    script.createEvent("UpdateEvent").bind(onUpdate);

    print("ScratchAndEffectsController: initialized. Point gesture = scratch mode (volume control)");
});

} catch(e) {
    print("ScratchAndEffectsController error: " + e);
}
