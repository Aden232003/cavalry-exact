// Copyright 2025 Scene Group Ltd.

// Simple Accumulator example.

// Create a new Comp.
var newComp = api.createComp("Accumulator");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var rectId = api.primitive("rectangle", "Rectangle");
var alignId = api.create("align");
var dupId = api.create("duplicator");
var randomId = api.create("random");
var accumulatorId = api.create("accumulator");

// Set the Attributes.
api.setGenerator(dupId, "generator", "pointDistribution");
api.set(dupId, {"generator.count": 5, "notes": "Try increasing the Count."});
api.set(randomId, {"minimum": 50, "maximum": 150, "useLayerAsSeed": false, "notes": "Try changing the Seed value."});
api.set(alignId, {"x": 1});
api.setStroke(rectId, true);
api.set(rectId, {"material.materialColor": "#c8c8c8", "stroke.strokeColor": "#6437ff"});

// Make the connections.
api.connect(rectId, "id", dupId, "shapes");
api.connect(alignId, "id", rectId, "deformers");
api.connect(randomId, "id", rectId, "generator.dimensions.x");
api.connect(accumulatorId, "id", dupId, "shapePosition.x");
api.connect(rectId, "generator.dimensions.x", accumulatorId, "value");

// Refresh
api.select([]);
api.updateAppTitleBar();