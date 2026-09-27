// Copyright 2025 Scene Group Ltd.

// Simple Forge Dynamics example.

// Create a new Comp.
var newComp = api.createComp("Forge Dynamics");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Shapes.
var text = api.create("textShape");
var ellipse = api.primitive("ellipse", "Ellipse");
var forge = api.create("forgeDynamicsShape");

// Set the Attributes.
api.set(text, {
    "text": "It's easy to create rigid body dynamics simulations using Forge.\n\nJust hit play.",
    "position": [-275,500],
    "material.materialColor": "#000000",
    "fontSize": 56,
    "horizontalAlignment": 1
});
api.set(ellipse, {
    "generator.radius": [50,50],
    "position.y": -100,
    "material.materialColor": "#6437ff"
});

// Connect to Forge.
api.connect(text, "id", forge, "shapes");
api.connect(ellipse, "id", forge, "shapes");
api.set(forge, {
    "shapes.0.shapeType": 2,
    "shapes.1.bodyType": 1
});

// Refresh UI
api.select([]);
api.updateAppTitleBar();