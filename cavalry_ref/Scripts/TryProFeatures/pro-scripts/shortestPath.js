// Copyright 2025 Scene Group Ltd.

// Simple Shortest Path example.

// Create a new Comp.
var newComp = api.createComp("Shortest Path");
api.setActiveComp(newComp);
api.set(newComp, {"backgroundColor": "#c8c8c8"});

// Create the Layers.
var ellipseId = api.primitive("ellipse", "Ellipse");
var shortestPathId = api.create("shortestPath");
var randomId = api.create("random");
var subDId = api.create("subdivide");

// Set the Attributes.
api.setFill(ellipseId, false);
api.setStroke(ellipseId, true);
api.set(ellipseId, {
    "generator.radius": [200,200],
    "stroke.strokeColor": "#ffff00",
    "stroke.width": 10
});
api.set(shortestPathId, {
    "stroke.width": 2,
    "stroke.strokeColor": "#6437ff",
    "count": 10,
    "endParam": 0.4,
    "distribution.seed": 1025,
    "distribution.size": [400,400],
    "notes": "Try changing the Random Distribution's Seed value."
});
api.set(randomId, {
    "minimum": 0.8,
    "maximum": 1.0
});

// Make the connection.
api.connect(ellipseId, "id", shortestPathId, "inputShape");
api.connect(randomId, "id", shortestPathId, "startParam");
api.connect(subDId, "id", shortestPathId, "deformers");

// Refresh UI
api.select([]);
api.updateAppTitleBar();