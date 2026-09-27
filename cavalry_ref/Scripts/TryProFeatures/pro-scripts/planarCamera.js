// Copyright 2025 Scene Group Ltd.

// Simple Camera example.

// Create a new Comp.
var newComp = api.createComp("Camera");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var rectFront = api.primitive("rectangle", "Front");
var rectBack = api.primitive("rectangle", "Back");
var rectLeft = api.primitive("rectangle", "Left");
var rectRight = api.primitive("rectangle", "Right");
var rectTop = api.primitive("rectangle", "Top");
var rectBottom = api.primitive("rectangle", "Bottom");
var cameraId = api.create("planarCamera");

// Set the positions and colours.
api.set(rectFront, {"is3d": true, "position.z": 100, "material.materialColor": "#4ffd7a"});
api.set(rectBack, {"is3d": true, "position.z": -100, "material.materialColor": "#000000"});
api.set(rectRight, {"is3d": true, "position.x": 100, "rotation.y": 90});
api.set(rectLeft, {"is3d": true, "position.x": -100, "rotation.y": 90});
api.set(rectTop, {"is3d": true, "position.y": 100, "rotation.x": 90, "material.materialColor": "#c8c8c8"});
api.set(rectBottom, {"is3d": true, "position.y": -100, "rotation.x": 90, "material.materialColor": "#000000"});
api.set(cameraId, {"position.x": -400, "position.y": 200, "notes": "Update position.x to rotate around the cube."});

// Refresh UI
api.select([]);
api.updateAppTitleBar();