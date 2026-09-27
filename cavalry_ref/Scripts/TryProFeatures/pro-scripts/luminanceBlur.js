// Copyright 2025 Scene Group Ltd.

// Simple Luminance Blur Filter example.

// Create a new Comp.
var newComp = api.createComp("Luminance Blur Filter");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var textId = api.create("textShape", "Image Attribution");
var rectId = api.primitive("rectangle", "Abstract Image");
var blurSourceId = api.primitive("rectangle", "Blur Shape");
var imageShaderId = api.create("imageShader");
var luminanceBlurId = api.create("luminanceBlur");
var gradientId = api.create("gradientShader");

// Load an image.
var imageAssetId = api.loadAsset(ui.scriptLocation + "/pro_assets/abstract.jpg", false);

// Set the Layers.
api.set(rectId, {
    "generator.dimensions": [640,360]
});
api.set(textId, {
    "text": "Photo by Alex Shuper on Unsplash",
    "fontSize": 30,
    "horizontalAlignment": 1,
    "verticalAlignment": 1,
    "position.y": -350,
    "autoWidth": true,
    "autoHeight": true
});

api.set(blurSourceId, {
    "generator.dimensions": [640,360],
    "hidden": true
});

api.set(gradientId, {
    "notes": "Adjust the Gradient's stops to affect the blur."
});

// Make the connections.
api.connect(imageShaderId, "id", rectId, "material.colorShaders");
api.connect(gradientId, "id", blurSourceId, "material.colorShaders");
api.connect(blurSourceId, "id", luminanceBlurId, "controlShape");
api.connect(luminanceBlurId, "id", rectId, "filters");
api.connect(imageAssetId, "id", imageShaderId, "image");

// Parent the Layers.
api.parent(imageShaderId, rectId);
api.parent(gradientId, blurSourceId);

// Refresh UI
api.select([]);
api.updateAppTitleBar();