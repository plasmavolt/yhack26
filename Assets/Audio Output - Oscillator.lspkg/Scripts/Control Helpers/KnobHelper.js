// KnobHelper.js
// Controls knob visual and allows to attach callback event
// Version 1.0.0
// Event On Awake 

// @input SceneObject control
// @ui {"widget" : "separator"}
// @input int intValue {"widget" : "combobox", "values": [{"label":"Float", "value" : "0"}, {"label":"Int", "value" : "1"}] , "label" : "Type"}
// @input float startValueFloat = 0.5 {"showIf" : "intValue", "showIfValue" : "0", "label" : "Initial"}
// @input float rangeMinFloat = 0  {"showIf" : "intValue", "showIfValue" : "0", "label" : "Min"}
// @input float rangeMaxFloat = 1 {"showIf" : "intValue", "showIfValue" : "0", "label" : "Max"}

// @input int startValueInt = 0 {"showIf" : "intValue", "showIfValue" : "1", "label" : "Start"}
// @input int range {"showIf" : "intValue", "showIfValue" : "1", "label" : "Values Count", "min" : 2}

// @ui {"widget" : "separator"}
// @input Component.ScriptComponent scriptWithApi
// @input string onValueChanged 
// @ui {"widget" : "separator"}
// @input bool settings
// @input Component.Camera camera  {"showIf" : "settings"}

const up = vec3.up();
const forward = vec3.forward();
const PI_2 = Math.PI * 2;

const eps = 1e-3;
const eps1 = 1e-6;

var parentTransform;
var controlTransform;

var startRot;
var rot;

var rayPos;
var rayDir;

var touchDown = false;

var value;
var prevValue;
var valueNorm;

var angle;

var rangeMin;
var rangeMax;

if (checkInputs()) {
    initialize();
}


function initialize() {
    controlTransform = script.control.getTransform();
    parentTransform = script.control.getParent().getTransform();
    startRot = controlTransform.getLocalRotation();

    var scriptComponent = script.control.createComponent("Component.ScriptComponent");

    scriptComponent.createEvent("TouchStartEvent").bind(onTouchStart);
    script.createEvent("TouchMoveEvent").bind(onTouchMove);
    script.createEvent("TouchEndEvent").bind(onTouchEnd);

    rangeMin = script.intValue ? 0 : script.rangeMinFloat;
    rangeMax = script.intValue ? script.range : script.rangeMaxFloat;
    value = script.intValue ? script.startValueInt : script.startValueFloat;
    valueNorm = (value - rangeMin) / (rangeMax - rangeMin);

    updateFromNormValue(valueNorm);
    invokeCallbacks(value);
}

function onTouchStart(eventData) {
    touchDown = true;
    onTouchMove(eventData);
}

function onTouchMove(eventData) {
    if (!touchDown) {
        return;
    }
    // camera pos
    rayPos = script.camera.screenSpaceToWorldSpace(eventData.getTouchPosition(), 0);
    // touch ray direction
    rayDir = script.camera.screenSpaceToWorldSpace(eventData.getTouchPosition(), 1).sub(rayPos);
    var result = intersectPlane(controlTransform.getWorldPosition(), controlTransform.forward, rayPos, rayDir);

    //transform position to local position
    if (result) {
        updateValueFromPos(parentTransform.getInvertedWorldTransform().multiplyPoint(result).normalize());
        invokeCallbacks(value);
    }
}

function updateFromNormValue(v) {
    valueNorm = v;
    valueNorm = (v + 1) % 1;
    if (script.intValue) {
        value = Math.floor(script.range * valueNorm);
        angle = PI_2 / script.range * value;
        rot = quat.angleAxis(-angle, forward);
    } else {
        rot = quat.angleAxis(PI_2 * v, vec3.back());
        value = script.rangeMinFloat + valueNorm * (script.rangeMaxFloat - script.rangeMinFloat);
    }
    controlTransform.setLocalRotation(rot.multiply(startRot));
}

function updateValueFromPos(pos) {
    angle = Math.atan2(pos.x * up.y - pos.y * up.x, pos.x * up.x + pos.y * up.y);
    updateFromNormValue(angle / PI_2);   
}

function onTouchEnd() {
    touchDown = false;
}

function invokeCallbacks(v) {
    if (prevValue == undefined || script.intValue && value != prevValue || !script.intValue && Math.abs(value - prevValue) > eps) {
        if (script.scriptWithApi && script.scriptWithApi[script.onValueChanged]) {
            script.scriptWithApi[script.onValueChanged](v);
        }
    }
    prevValue = value;
}

function clamp(val, a, b) {
    return Math.max(Math.min(val, Math.max(a, b)), Math.min(a, b));
}

function intersectPlane(planePos, planeNormal, rayPos, rayDir) {
    // assuming vectors are all normalized
    var denom = -planeNormal.dot(rayDir);
    if (denom > eps1) {
        var offset = planePos.sub(rayPos);
        var dist = -offset.dot(planeNormal) / denom;
        if (dist >= 0) {
            return rayPos.add(rayDir.uniformScale(dist));
        }
    }
    return null;
}

//check inputs

function checkInputs() {
    if (!script.control) {
        print("Knob control sceneObject is not set on " + script.getSceneObject().name);
        return false;
    }
    var intComp = script.control.getComponent("Component.InteractionComponent");
    if (!intComp) {
        print("No interaction component found on " + script.control.name);
        return false;
    }
    if (!script.camera) {
        print("Camera is not set found on " + script.getSceneObject().name);
        return false;
    }
    return true;
}

//public api
script.getValueNormalized = function() {
    return valueNorm;
};

script.setValueNormalized = function(v) {
    valueNorm = clamp(v, 0, 1);
    updateFromNormValue(valueNorm);
};

script.getValue = function() {
    return value;
};

script.setValue = function(v) {
    value = clamp(v, rangeMin, rangeMax);
    valueNorm = (value - rangeMin) / (rangeMax - rangeMin);
    updateFromNormValue(valueNorm);
};