// EnableInEditorOnly.js
// Enables this scene object only in Lens Studio (disabling them on device)
// Version 1.0.0
// Event - On Awake

script.getSceneObject().enabled = global.deviceInfoSystem.isEditor();
