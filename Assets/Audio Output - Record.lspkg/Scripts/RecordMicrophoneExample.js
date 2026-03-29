// RecordMicrophoneExample.js
// Provides an example of how to record an audio sample from the microphona and play it back 
// Requires AudioHelpers.js
// Version 1.0.0
// Event: AnAwake 

// @input Asset.AudioTrackAsset microphoneAudio 
// @input Component.ScriptComponent loadingIndicator 

const MAX_SAMPLES = 160000;
const SIZE_OF_FLOAT = 4;

var control;
var audioBuffer = new Float32Array(MAX_SAMPLES);

var audioFrame;
var audioFrameShape;
var maxFrameSize;

var samplePlayer;

var pointer = 0;
var updateEvent;

initialize();

function initialize() {

    if (!global.audioOutput) {
        print("Error, please add Audio Output script to scene");
        return;
    }
    if (!global.AudioHelpers) {
        print("Error, please add Audio Helpers script to the scene");
        return;
    }
    if (!script.microphoneAudio) {
        print("Error, please set Microphoone Audio on " + script.getSceneObject().name + " scene object");
        return;
    }
    var output = global.audioOutput;

    control = script.microphoneAudio.control;
    control.sampleRate = output.sampleRate;
    //create buffer player 
    samplePlayer = new global.AudioHelpers.BufferPlayer(audioBuffer);

    output.connect(samplePlayer);

    updateEvent = script.createEvent("UpdateEvent");
    updateEvent.enabled = false; //disable event, enabled only when recording
    updateEvent.bind(readData);
}

function readData() {
    if (MAX_SAMPLES - pointer < maxFrameSize) {
        updateEvent.enabled = false;
        updatePlayer();
    } else {
        audioFrame = new Float32Array(audioBuffer.buffer, pointer * SIZE_OF_FLOAT);
        audioFrameShape = control.getAudioFrame(audioFrame);
        pointer = Math.min(audioFrameShape.x + pointer, MAX_SAMPLES);
        if (script.loadingIndicator) {
            script.loadingIndicator.setProgress(pointer / MAX_SAMPLES);
        }
    }
}
function updatePlayer() {
    samplePlayer.size = pointer;
    if (script.loadingIndicator) {
        script.loadingIndicator.setProgress(0);
    }
}

function reset() {
    samplePlayer.stop();
    if (Float32Array.fill) {
        audioBuffer.fill(0);
    } else {
        for (var i = 0; i < pointer; i++) {
            audioBuffer[i] = 0;
        }
    }
    pointer = 0;
    if (script.loadingIndicator) {
        script.loadingIndicator.setProgress(0);
    }
}

//public api 
script.startRecording = function() {
    reset();
    control.start();
    updateEvent.enabled = true;
};

script.stopRecording = function() {
    control.stop();
    updateEvent.enabled = false;
    updatePlayer();
};

script.play = function() {
    samplePlayer.play(1);
};