// SliderHelper.js
// Controls slider visual and allows to attach callback event
// Version 1.0.0
// Event On Awake 

//@input SceneObject control
//@ui {"widget" : "separator"}
//@input int intValue {"widget" : "combobox", "values": [{"label":"Float", "value" : "0"}, {"label":"Int", "value" : "1"}] , "label" : "Type"}
//@input float startValueFloat = 0.5 {"showIf" : "intValue", "showIfValue" : "0", "label" : "Initial"}
//@input float rangeMinFloat = 0  {"showIf" : "intValue", "showIfValue" : "0", "label" : "Min"}
//@input float rangeMaxFloat = 1 {"showIf" : "intValue", "showIfValue" : "0", "label" : "Max"}

//@input float startValueInt = 0 {"showIf" : "intValue", "showIfValue" : "1", "label" : "Start"}
//@input float rangeMinInt = 0  {"showIf" : "intValue", "showIfValue" : "1", "label" : "Min"}
//@input float rangeMaxInt = 10 {"showIf" : "intValue", "showIfValue" : "1", "label" : "Max"}

//@ui {"widget" : "separator"}
//@input Component.ScriptComponent scriptWithApi
//@input string onValueChanged 
//@ui {"widget" : "separator"}
//@input bool settings 
//@input vec3 minPos {"showIf" : "settings"}
//@input vec3 maxPos  {"showIf" : "settings"}

//@input Component.Camera camera  {"showIf" : "settings"}

const eps = 1e-3;
const eps1 = 1e-6;

var parentTransform;
var controlTransform;

var rayPos;
var rayDir;

var touchDown = false;
var value;
var prevValue;
var valueNorm;

var rangeMin;
var rangeMax;

var pos;

if (checkInputs()) {
    initialize();
}


function initialize() {
    controlTransform = script.control.getTransform();
    parentTransform = script.control.getParent().getTransform();

    var scriptComponent = script.control.createComponent("Component.ScriptComponent");

    scriptComponent.createEvent("TouchStartEvent").bind(onTouchStart);
    script.createEvent("TouchMoveEvent").bind(onTouchMove);
    script.createEvent("TouchEndEvent").bind(onTouchEnd);

    rangeMin = script.intValue ? script.rangeMinInt : script.rangeMinFloat;
    rangeMax = script.intValue ? script.rangeMaxInt : script.rangeMaxFloat;
    value = script.intValue ? script.startValueInt : script.startValueFloat;
    valueNorm = (value - rangeMin) / (rangeMax - rangeMin);

    updateFromNormValue(valueNorm);

    invokeCallbacks(value);
}

function onTouchStart() {
    touchDown = true;
}

function onTouchMove(eventData) {
    if (!touchDown) {
        return;
    }
    rayPos = script.camera.screenSpaceToWorldSpace(eventData.getTouchPosition(), 0);
    rayDir = script.camera.screenSpaceToWorldSpace(eventData.getTouchPosition(), 1).sub(rayPos);
    var result = intersectPlane(controlTransform.getWorldPosition(), controlTransform.forward, rayPos, rayDir);
    if (!result) {
        return;
    }
    pos = parentTransform.getInvertedWorldTransform().multiplyPoint(result);
    pos.x = clamp(pos.x, script.minPos.x, script.maxPos.x);
    pos.y = clamp(pos.y, script.minPos.y, script.maxPos.y);
    pos.z = clamp(pos.z, script.minPos.z, script.maxPos.z);

    updateValueFromPos(pos);
    invokeCallbacks(value);
}

function updateFromNormValue(v) {
    pos = vec3.lerp(script.minPos, script.maxPos, v);
    controlTransform.setLocalPosition(pos);
}

function updateValueFromPos(pos) {
    valueNorm = pos.sub(script.minPos).length / script.maxPos.sub(script.minPos).length;
    if (script.intValue) {
        value = rangeMin + Math.round(valueNorm * (rangeMax - rangeMin));
        valueNorm = value / (rangeMax - rangeMin);
        pos = vec3.lerp(script.minPos, script.maxPos, valueNorm);
    } else {
        value = rangeMin + valueNorm * (rangeMax - rangeMin);
    }
    controlTransform.setLocalPosition(pos);
}

function invokeCallbacks(v) {
    if (prevValue == undefined || script.intValue && value != prevValue || !script.intValue && Math.abs(value - prevValue) > eps) {
        if (script.scriptWithApi && script.scriptWithApi[script.onValueChanged]) {
            script.scriptWithApi[script.onValueChanged](v);
        }
    }
    prevValue = value;
}

function onTouchEnd() {
    touchDown = false;
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
    if (script.intValue) {
        //clamp start value to range
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