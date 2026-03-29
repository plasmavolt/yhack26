// Audio Output.js
// Allows to write data to audio output and play it
// Version 1.0.0
// Event - onAwake

// @input Component.AudioComponent audioComponent
// @input Asset.AudioTrackAsset audioOutputAsset
// @input int sampleRate = 44100 {"widget" : "combobox", "values" : [{"label" : "4000", "value" : 4000}, {"label" : "8000", "value" : 8000},{"label" : "16000", "value" : 16000}, {"label" : "32000", "value" : 32000}, {"label" : "44100", "value" : 44100}, {"label" : "48000", "value" : 48000}], "hint" : "Number or samples per second"}

const BUFFER_SIZE = 640000;

var AudioOutput = function(audioTrack, sampleRate) {
    this.control = audioTrack.control;
    this.sampleRate = sampleRate;
    this.samples = 0;
    this.control.sampleRate = sampleRate;
    this.data = new Float32Array(BUFFER_SIZE);
    this.players = [];
};

AudioOutput.prototype.update = function() {
    this.samples = this.control.getPreferredFrameSize();
};

AudioOutput.prototype.lateUpdate = function() {
    if (this.samples == 0) {
        return;
    }
    this.clear(this.samples);
    for (var i = 0; i < this.players.length; i++) {
        this.players[i].getSamples(this.data, this.samples);
    }
    this.control.enqueueAudioFrame(this.data, new vec3(this.samples, 1, 1));
};

AudioOutput.prototype.connect = function(p) {
    if (p.getSamples == undefined) {
        print("Error, player should have getSamples (Float32Array data, float samples) method");
        return;
    }
    if (this.players.indexOf(p) != -1) {
        return;
    }
    this.players.push(p);
};

AudioOutput.prototype.disconnect = function(p) {
    var index = this.players.indexOf(p);
    if (index !== -1) {
        this.players.splice(p, 1);
    }
};

AudioOutput.prototype.clear = function(v) {
    if (this.data.fill) {
        this.data.fill(0);
    } else {
        for (var i = 0; i < v; i++) {
            this.data[i] = 0;
        }
    }
};

var audioOutput = new AudioOutput(script.audioOutputAsset, script.sampleRate);

script.audioComponent.audioTrack = script.audioOutputAsset;
script.audioComponent.play(-1);

script.createEvent("UpdateEvent").bind(function() {
    audioOutput.update();
});

script.createEvent("LateUpdateEvent").bind(function() {
    audioOutput.lateUpdate();
});

global.audioOutput = audioOutput;

//public api for audio frame texture
script.getAudioFrame = function() {
    return audioOutput.data;
};