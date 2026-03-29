// AudioFrameToTexture.js
// writes audio frame values to the proxy texture 
// of size (frameSize, 1) and one channel 
// this texture can be used and decoded in the Material or VFX editor

// Version 1.1.0
// Event - on awake

// @input Component.ScriptComponent audioFrameProvider
// @ui {"widget" : "separator"}
// @input Asset.Texture proxyTexture
// @input int frameSize = 512

var textureProvider;
var getAudioFrameFunc;
var textureData;
var audioFrame;

function initialize() {

    var audioFrameTexture = ProceduralTextureProvider.create(script.frameSize, 1, Colorspace.R);
    textureProvider = audioFrameTexture.control;
    script.proxyTexture.control = textureProvider;
    textureData = new Uint8Array(script.frameSize);
    if (script.audioFrameProvider && script.audioFrameProvider.getAudioFrame)  {
        getAudioFrameFunc =  script.audioFrameProvider.getAudioFrame;
        script.createEvent("UpdateEvent").bind(updateTexture);
    } else {
        print("Script with getAudioFrame api is not set");
    }
}

function updateTexture() {
    audioFrame = getAudioFrameFunc();
    var len = audioFrame.length;
    for (var i = 0; i < Math.min(script.frameSize, len); i++) {
        textureData[i] = (audioFrame[i] + 1) * 127.5;
    }
    textureProvider.setPixels(0, 0, script.frameSize, 1, textureData);
}

initialize();
