// Audio Helpers.js
// Collection of classes that allow to generate and play audio 
// Version 1.0.0
// Event On Awake - Put at the top of hierarchy

const PI = Math.PI;
const PI_2 = Math.PI * 2;
const SAMPLE_RATE = 16000;
const EPS = 0.0001;

//begin Oscillator class
var Oscillator = function(options) {
    this.t = 0;
    this.frequency = 144;
    this.amplitude = 1.0;
    this.sampleRate = SAMPLE_RATE;
    this.form = Oscillator.Form.Sin;
    this.step = PI_2 * this.frequency / this.sampleRate;
    this.updateOptions(options);
};

Oscillator.prototype.updateOptions = function(options) {
    if (options == undefined) {
        return;
    }
    this.frequency = getNumberOption(options, "frequency", this.frequency);
    this.amplitude = getNumberOption(options, "amplitude", this.amplitude);
    this.sampleRate = getNumberOption(options, "sampleRate", this.sampleRate);
    this.form = getEnumOption(options, "form", Oscillator.Form, this.form);
};

Oscillator.prototype.getSamples = function(data, numSamples) {
    if (this.amplitude < EPS) {
        return;
    }
    this.step = PI_2 * this.frequency / this.sampleRate;
    for (var i = 0; i < numSamples; i++) {
        data[i] += this.getSample();
    }
};

Oscillator.prototype.getSample = function() {
    var sample = this.amplitude * Oscillator.Generator[this.form](this.t);
    this.t = (this.t + this.step) % PI_2;
    return sample;
};

Oscillator.Form = {
    Sin: "Sin",
    Square: "Square",
    Triangle: "Triangle",
    Sawtooth: "Sawtooth"
};

Oscillator.Generator = {
    Sin: function(phase) {
        return Math.sin(phase);
    },
    Square: function(phase) {
        return Math.sign(Math.sin(phase));
    },
    Triangle: function(phase) {
        return 2.0 / PI * Math.asin(Math.sin(phase));
    },
    Sawtooth: function(phase) {
        return 2.0 / PI * Math.atan(Math.tan(phase / 2));
        //return phase - Math.floor(phase);
    }
};

Oscillator.prototype.toString = function() {
    return "Oscillator : form " + this.form + ", frequency: " + this.frequency + ", amplitude " + this.amplitude + ", sampleRate " + this.sampleRate;
};

// Noise - begin

var Noise = function(options) {
    this.amplitude = 1.0;
    this.type = Noise.Type.White;
    this.updateOptions(options);
    this.values = [0, 0, 0, 0, 0, 0, 0]; // for pink noise
};

Noise.prototype.updateOptions = function(options) {
    if (options == undefined) {
        return;
    }
    this.amplitude = getNumberOption(options, "amplitude", this.amplitude);
    this.type = getEnumOption(options, "type", Noise.Type, this.type);
};

Noise.prototype.getSamples = function(data, numSamples) {
    for (var i = 0; i < numSamples; i++) {
        data[i] += Noise.Generator[this.type](this.values) * this.amplitude;
    }
};

Noise.Type = {
    White: "White",
    Pink: "Pink",
    Brownian: "Brownian"
};
//source https://noisehack.com/generate-noise-web-audio-api/
Noise.Generator = {
    White: function() {
        return Math.random() * 2 - 1;
    },
    Pink: function(b) {
        var white = Math.random() * 2 - 1;
        b[0] = 0.99886 * b[0] + white * 0.0555179;
        b[1] = 0.99332 * b[1] + white * 0.0750759;
        b[2] = 0.96900 * b[2] + white * 0.1538520;
        b[3] = 0.86650 * b[3] + white * 0.3104856;
        b[4] = 0.55000 * b[4] + white * 0.5329522;
        b[5] = -0.7616 * b[5] - white * 0.0168980;
        var value = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362) * 0.11;
        b[6] = white * 0.115926;
        return value;
    },
    Brownian: function(b) {
        var white = Math.random() * 2 - 1;
        b[0] = (b[0] + (0.02 * white)) / 1.02;
        return b[0] * 3.5;
    }
};

Noise.prototype.toString = function() {
    return "Noise : " + this.type + ", amplitude " + this.amplitude;
};
// Noise - end

// Envelope - begin 

var Envelope = function(options) {
    //default values
    this.attack = 0.1;
    this.decay = 0.2;
    this.sustain = 0.8;
    this.release = 0.2;

    this.timeOn = 0;
    this.timeOff = -100;

    this.isOn = false;

    this.updateOptions(options);
};

Envelope.prototype.updateOptions = function(options) {
    if (options == undefined) {
        return;
    }
    this.attack = getNumberOption(options, "attack", this.attack);
    this.decay = getNumberOption(options, "decay", this.decay);
    this.sustain = getNumberOption(options, "sustain", this.sustain);
    this.release = getNumberOption(options, "release", this.release);
};

Envelope.prototype.getCurrentValue = function() {
    var t = getTime() - this.timeOn;
    var amplitude = 0;
    if (this.isOn) {
        if (t < this.attack) {
            amplitude = (t / this.attack) * 1.0;
        } else if (t < this.attack + this.decay) {
            amplitude = 1.0 - (t - this.attack) / this.decay * (1.0 - this.sustain);
        } else if (t > this.attack + this.decay) {
            amplitude = this.sustain;
        }
    } else {
        if (t - this.timeOff < this.release) {
            amplitude = this.sustain * (1.0 - (t - this.timeOff) / this.release);
            if (amplitude <= EPS) {
                amplitude = 0;
            }
        }
    }
    return amplitude;
};

Envelope.prototype.on = function(time) {
    this.timeOn = time != undefined ? time : getTime();
    this.isOn = true;
};

Envelope.prototype.off = function() {
    this.timeOff = getTime() - this.timeOn;
    this.isOn = false;
};

Envelope.prototype.toString = function() {
    return "Envelope : attack " + this.attack + ", decay: " + this.decay + ", sustain " + this.sustain + ", release " + this.release;
};

// Envelope - end 

// Buffer Player - start
var BufferPlayer = function(buffer) {
    this.buffer = buffer;
    this.size = buffer.length;
    this.offset = 0; //offset in samples
    this.loops = 1;
    this.currentLoop = 0;
    this.isPlaying = false;
};

BufferPlayer.prototype.updateOptions = function(options) {
    if (options == undefined) {
        return;
    }
    //implement
};
BufferPlayer.prototype.getSamples = function(data, numSamples) {
    if (this.offset >= this.size || !this.isPlaying) {
        return;
    }
    for (var i = 0; i < Math.max(numSamples, this.size); i++) {
        data[i] += this.buffer[this.offset + i];
    }
    this.offset += numSamples;
};

BufferPlayer.prototype.play = function(loops) {
    this.loops = loops;
    this.position = 0;
    this.offset = 0;
    this.isPlaying = true;
};

BufferPlayer.prototype.stop = function() {
    this.position = 0;
    this.offset = 0;
    this.isPlaying = false;
};

BufferPlayer.prototype.resume = function() {
    this.isPlaying = true;
};

BufferPlayer.prototype.pause = function() {
    this.isPlaying = false;
};
// Buffer Player - end

//AudioTrackPlayer - start
var AudioTrackPlayer = function(audioTrack) {
    this.control = audioTrack.control;
    this.size = this.control.sampleRate * this.control.duration;
    this.buffer = new Float32Array(this.control.maxFrameSize);
    this.audioFrameShape = new vec3(0, 1, 1);
    this.amplitude = 1.0;
    this.isPlaying = false;
};

AudioTrackPlayer.prototype.getSamples = function(data, numSamples) {
    if (this.offset >= this.size || !this.isPlaying) {
        return;
    }
    this.audioFrameShape = this.control.getAudioBuffer(this.buffer, numSamples);
    var subBuffer = new Float32Array(this.buffer.buffer, 0, this.audioFrameShape.x);
    TensorMath.mulScalar(subBuffer, this.amplitude, subBuffer);
    TensorMath.addTensors(data, this.audioFrameShape, this.buffer, this.audioFrameShape, data);
};

AudioTrackPlayer.prototype.toString = function() {
    return this.control;
};

AudioTrackPlayer.prototype.play = function(loops) {
    this.control.loops = loops;
    this.control.position = 0;
    this.isPlaying = true;
};

AudioTrackPlayer.prototype.stop = function() {
    this.control.position = 0;
    this.isPlaying = false;
};

AudioTrackPlayer.prototype.resume = function() {
    this.isPlaying = true;
};

AudioTrackPlayer.prototype.pause = function() {
    this.isPlaying = false;
};

if (!global.AudioHelpers) {
    global.AudioHelpers = {};
}

//Useful functions 
const NOTES = {
    A: 21,
    B: 23,
    C: 24,
    D: 26,
    E: 28,
    F: 29,
    G: 31
};
// taken from https://p5js.org/download/support.html

function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12.0);
}

function noteToFreq(note) {
    var value = NOTES[note[0].toUpperCase()];
    var octave = note.slice(-1);
    value += 12 * (octave);

    switch (note[1]) {
        case "#":
            value += 1;
            break;

        case "b":
            value -= 1;
            break;
        default:
            break;
    }

    return midiToFreq(value);
}

function getNumberOption(options, key, value) {
    if (options[key] != undefined && typeof options[key] === "number") {
        return options[key];
    } else {
        return value;
    }
}

function getEnumOption(options, key, enumObject, value) {
    if (options[key] != undefined && enumObject[options[key]] != undefined) {
        return options[key];
    } else {
        return value;
    }
}
//Audio Helpers Namespace

global.AudioHelpers = {
    Oscillator: Oscillator,
    Noise: Noise,
    Envelope: Envelope,
    BufferPlayer: BufferPlayer,
    AudioTrackPlayer: AudioTrackPlayer,
    noteToFreq: noteToFreq,
    midiToFreq: midiToFreq,
};
