// Copyright 2025 Scene Group Ltd.

// Simple Extrude example.

// Create a new Comp.
var newComp = api.createComp("Extrude");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Shapes.
var text = api.create("textShape");
var extrude = api.create("extrude");

api.connect(text, "id", extrude, "inputShapes");

// Set the sizes and colours.
api.set(text, {"font.style": "Black", "fontSize": 150, "material.materialColor": "#6437ff", "horizontalAlignment": 1, "verticalAlignment": 1, "autoWidth": true, "autoHeight": true});
api.set(extrude, {"material.materialColor": "#c8c8c8"});

// Parent the Text to the Extrude.
api.parent(text, extrude);

// Refresh UI
api.select([]);
api.updateAppTitleBar();