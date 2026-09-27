// Copyright 2025 Scene Group Ltd.

// Simple Spherise Filter example.

// Create a new Comp.
var newComp = api.createComp("Spherise Filter");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var rectId = api.primitive("rectangle", "Rectangle");
var checkerboardShaderId = api.create("checkerboardShader");
var spheriseId = api.create("sceneGroup::spheriseFilter");

// Set the Layers.
api.set(rectId, {
    "generator.dimensions": [2000,1000]
});

api.set(checkerboardShaderId, {
    "size": [100,100]
});

api.set(spheriseId, {
    "radius": 70,
    "rotation": [-28, 32, 7],
    "enableLighting": true
});

// Make the connections.
api.connect(checkerboardShaderId, "id", rectId, "material.colorShaders");
api.connect(spheriseId, "id", rectId, "filters");

// Parent the Layers.
api.parent(checkerboardShaderId, rectId);

// Refresh UI
api.select([]);
api.updateAppTitleBar();