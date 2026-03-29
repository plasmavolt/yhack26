// AudioTrackExample.js — stem volume from Toggle Channels package.
// Requires AudioHelpers.js + Audio Output on scene.

// @input float amplitude = 0.5 {"min": 0, "max" : 1}
// @input int loops = 1
// @input Asset.AudioTrackAsset audioTrack
// @input bool playOnAwake = false
// @input bool useHandTracking = true
// @input int fingerIndex = 0 {"min":0,"max":4,"hint":"0 thumb … 4 pinky"}
// @input float extendCosThreshold = 0.38 {"min":0.1,"max":0.9,"step":0.02}
// @input bool fullMixWhenHandLost = false {"hint":"If false: mute all stems when hand not tracked (recommended). If true: full mix when lost (editor preview)."}

if (!global.audioOutput) {
    print("Error, please add Audio Output script to scene");
    return;
}
if (!global.AudioHelpers) {
    print("Error, please add Audio Helpers script to the scene");
    return;
}
var output = global.audioOutput;

var isPlaying = script.playOnAwake;
script.audioTrack.control.loops = -1;
script.audioTrack.control.sampleRate = output.sampleRate;

var player = new global.AudioHelpers.AudioTrackPlayer(script.audioTrack);
player.amplitude = isPlaying ? script.amplitude : 0;

output.connect(player);
player.play(script.loops);

/** True when we can read finger joints (looser than HandTracking.isTracking(), which needs Center AND Wrist). */
function handReady() {
    var HT = global.HandTracking;
    if (!HT) {
        return false;
    }
    var w = HT.Wrist && HT.Wrist.isTracking();
    var c = HT.Center && HT.Center.isTracking();
    return w || c;
}

function chainExtended(mcp, pip, tip) {
    var HT = global.HandTracking;
    if (!HT || !HT[mcp] || !HT[pip] || !HT[tip]) {
        return false;
    }
    var a = HT[mcp];
    var b = HT[pip];
    var c = HT[tip];
    if (!a.isTracking() || !b.isTracking() || !c.isTracking()) {
        return false;
    }
    var p0 = a.getWorldPosition();
    var p1 = b.getWorldPosition();
    var p2 = c.getWorldPosition();
    var v1 = p1.sub(p0);
    var v2 = p2.sub(p1);
    var l1 = v1.length;
    var l2 = v2.length;
    if (l1 < 1e-5 || l2 < 1e-5) {
        return false;
    }
    return v1.dot(v2) / (l1 * l2) > script.extendCosThreshold;
}

function fingerUp(idx) {
    idx = Math.max(0, Math.min(4, idx | 0));
    if (idx === 0) {
        return chainExtended("Thumb0", "Thumb2", "Thumb3");
    }
    if (idx === 1) {
        return chainExtended("Index0", "Index2", "Index3");
    }
    if (idx === 2) {
        return chainExtended("Middle0", "Middle2", "Middle3");
    }
    if (idx === 3) {
        return chainExtended("Ring0", "Ring2", "Ring3");
    }
    return chainExtended("Pinky0", "Pinky2", "Pinky3");
}

function applyHandVolume() {
    if (!script.useHandTracking) {
        return;
    }
    var ready = handReady();
    var on;
    if (!ready) {
        on = script.fullMixWhenHandLost;
    } else {
        on = fingerUp(script.fingerIndex);
    }
    var scratchVol = (global.scratchVolume != null) ? global.scratchVolume : 1.0;
    player.amplitude = on ? (script.amplitude * scratchVol) : 0;
    isPlaying = on;
}

script.createEvent("LateUpdateEvent").bind(applyHandVolume);

script.toggleOn = function() {
    if (script.useHandTracking) {
        return;
    }
    isPlaying = true;
    player.amplitude = script.amplitude;
};

script.toggleOff = function() {
    if (script.useHandTracking) {
        return;
    }
    isPlaying = false;
    player.amplitude = 0;
};

script.toggle = function() {
    if (script.useHandTracking) {
        return;
    }
    isPlaying = !isPlaying;
    player.amplitude = isPlaying ? script.amplitude : 0;
};
