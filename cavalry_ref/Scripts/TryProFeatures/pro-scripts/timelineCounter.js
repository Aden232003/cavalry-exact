// Copyright 2025 Scene Group Ltd.

// Simple Timeline Counter example.

// Create a new Comp.
var newComp = api.createComp("Timeline Counter");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var ellipse = api.primitive("ellipse", "Ellipse");
var counter = api.create("timelineCounter");

// Connect the Timeline Counter.
api.connect(counter, "out", ellipse, "position.y");
api.setAttributeExpression(ellipse, "position.y", "*100");

// Set the attributes.
api.set(counter, {"countMode": 1, "convolutionSize": 25, "notes": "Try moving the Time Marker or adding another one."});
api.set(ellipse, {"material.materialColor": "#6437ff", "notes": "The connection to position.y from the Timeline Counter includes an Attribute Expression to multiply the result."});

// Add a Time Marker.
api.createTimeMarker(24);

// Refresh UI
api.select([]);
api.updateAppTitleBar();