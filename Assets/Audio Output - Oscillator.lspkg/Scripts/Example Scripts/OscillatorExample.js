// OscillatorExample.js
// Provides an example of how to create a simple oscillator and control it's settings
// Requires AudioHelpers.js
// Version 1.0.0
// Event - onAwake

// @input Component.Text frequencyText 
// @input Component.Text amplitudeText
// @input Component.Text waveformText


var WaveTypes = ["Sin", "Square", "Triangle", "Sawtooth"];

if (!global.audioOutput) {
    print("Error, please add Audio Output script to scene");
    return;
}
if (!global.AudioHelpers) {
    print("Error, please add Audio Helpers script to the scene");
    return;
}


var output = global.audioOutput;
//create oscillator default values
var osc = new global.AudioHelpers.Oscillator({
    //sampleRate : output.sampleRate
});
// connect to the output
output.connect(osc);

//public api functions (to call from control helper scripts)

script.setForm = function(idx) {
    osc.form = WaveTypes[idx];
    if (script.waveformText) {
        script.waveformText.text = WaveTypes[idx].toUpperCase();
    }
};

script.setAmplitude = function(v) {
    osc.amplitude = v;
    if (script.amplitudeText) {
        script.amplitudeText.text = v.toFixed(2);
    }
};

script.setFrequency = function(v) {
    osc.frequency = v;
    if (script.frequencyText) {
        script.frequencyText.text = Math.floor(v) + " HZ";
    }
};
