// TrackManager.js
// Synchronized multi-track player — switching tracks keeps the same playhead position.
// Requires AudioOutput.js and AudioHelpers.js to be present in the scene (run before this).
// Event: On Awake

// @input Asset.AudioTrackAsset track1
// @input Asset.AudioTrackAsset track2
// @input Asset.AudioTrackAsset track3
// @input Asset.AudioTrackAsset track4

var TRACKS = [script.track1, script.track2, script.track3, script.track4];
var TRIGGERS = ["one_start", "two_start", "three_start", "four_start"];

var players = [];
var masterClock = 0;       // seconds elapsed since playback started
var clockStartTime = 0;    // getTime() snapshot when clock started
var isPlaying = false;
var currentIndex = -1;

// ── Master clock ──────────────────────────────────────────────────────────────

function startClock() {
    clockStartTime = getTime();
    isPlaying = true;
}

function getElapsed() {
    if (!isPlaying) return 0;
    return masterClock + (getTime() - clockStartTime);
}

// ── Track switching ───────────────────────────────────────────────────────────

function switchToTrack(index) {
    var player = players[index];
    if (!player) {
        print("[TrackManager] No track assigned to slot " + (index + 1));
        return;
    }
    if (index === currentIndex) return;

    var elapsed = getElapsed();

    // Disconnect and stop the current track
    if (currentIndex >= 0 && players[currentIndex]) {
        global.audioOutput.disconnect(players[currentIndex]);
        players[currentIndex].isPlaying = false;
    }

    // Seek new track to the same position in its loop
    var duration = player.control.duration;
    var seekTo = duration > 0 ? elapsed % duration : 0;
    player.control.position = seekTo;
    player.control.loops = -1;   // loop indefinitely
    player.isPlaying = true;

    global.audioOutput.connect(player);

    // Start the master clock on first play
    if (!isPlaying) {
        startClock();
    }

    currentIndex = index;
    print("[TrackManager] Track " + (index + 1) + " — seek to " + seekTo.toFixed(3) + "s (elapsed " + elapsed.toFixed(3) + "s)");
}

// ── Deferred init (runs on Start, after AudioOutput.js has set global.audioOutput) ──

script.createEvent("TurnOnEvent").bind(function() {
    if (!global.audioOutput) {
        print("[TrackManager] Error: AudioOutput not found. Add the Audio Output prefab to your scene.");
        return;
    }
    if (!global.AudioHelpers) {
        print("[TrackManager] Error: AudioHelpers not found. Add AudioHelpers.js to your scene.");
        return;
    }

    // Build AudioTrackPlayer instances now that globals are ready
    players = TRACKS.map(function(t) {
        return t ? new global.AudioHelpers.AudioTrackPlayer(t) : null;
    });

    // Bind gesture triggers
    TRIGGERS.forEach(function(triggerName, i) {
        var ev = script.createEvent("BehaviorEvent");
        ev.behaviorTrigger = triggerName;
        ev.bind(function() { switchToTrack(i); });
    });

    print("[TrackManager] Initialized with " + players.filter(Boolean).length + " tracks.");
});
