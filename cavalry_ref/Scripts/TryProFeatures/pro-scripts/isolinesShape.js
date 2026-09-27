// Copyright 2025 Scene Group Ltd.

// Simple Isolines example.

// Create a new Comp.
var newComp = api.createComp("Isolines");
api.setActiveComp(newComp);
api.set(newComp, {"backgroundColor": "#c8c8c8", "resolution": [1080,1080]});

// Create the Layers.
var rectId = api.primitive("rectangle", "Rectangle");
var isoId = api.create("isolinesShape", "Isolines Shape");
var gradId = api.create("multiPointGradientShader", "Multi-Point Gradient Shader");

// Set the Attributes.
api.set(rectId, {
    "generator.dimensions": [800,800]
});
api.addArrayIndex(gradId, "point");
api.addArrayIndex(gradId, "point");
api.set(gradId, {
    "point.0.pointPosition": [-200,50],
    "point.1.pointPosition": [250,90],
    "point.2.pointPosition": [-100,110],
    "point.2.pointColor": "#ffffff",
    "point.3.pointPosition": [-140,-75],
    "point.3.pointColor": "#000000",
    "notes": "Select this Layer using the Select tool and then move the Gradient's points in the Viewport."
});
api.set(isoId, {
    "stroke.strokeColor": "#4ffd7a",
    "levels": 10
});

// Make the connections.
api.connect(rectId, "id", isoId, "inputShape");
api.connect(gradId, "id", rectId, "material.colorShaders");

// Refresh UI
api.select([]);
api.updateAppTitleBar();