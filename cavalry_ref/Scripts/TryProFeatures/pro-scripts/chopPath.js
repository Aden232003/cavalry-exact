// Copyright 2025 Scene Group Ltd.

// Simple Chop Path example.

// Create a new Comp.
var newComp = api.createComp("Chop Path");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var randId = api.create("random");
var chopId = api.create("chopPath");
var textId = api.create("textShape", "CHOP");

// Set the Attributes.
api.set(textId, {
    "text": "CHOP",
    "font.style": "Black",
    "fontSize": 300,
    "horizontalAlignment": 1,
    "verticalAlignment": 1,
    "autoWidth": true,
    "autoHeight": true,
    "material.materialColor": "#6437ff"
});
api.set(randId, {
    "minimum": -30,
    "maximum": 30,
    "notes": "Try changing the Seed value."
})

// Make the connections.
api.connect(chopId, "id", textId, "deformers");
api.connect(randId, "id", chopId, "offset");

// Refresh UI
api.select([]);
api.updateAppTitleBar();