// Copyright 2025 Scene Group Ltd.

// Simple Chroma Key Filter example.

// Create a new Comp.
var newComp = api.createComp("Chroma Key Filter");
api.set(newComp, {"resolution": [1080,1080], "backgroundColor": "#c8c8c8"});
api.setActiveComp(newComp);

// Create the Layers.
var rectId = api.primitive("rectangle", "Colored Square");
var imageShapeId = api.primitive("rectangle", "Image");
var imageShaderId = api.create("imageShader");
var chromaKeyId = api.create("sceneGroup::chromaKeyFilter", "Chroma Key Filter");
var textId = api.create("textShape", "Image Attribution");

// Load an image.
var imageAssetId = api.loadAsset(ui.scriptLocation + "/pro_assets/green-screen.jpg", false);

// Set the Attributes
api.set(rectId, {
    "generator.dimensions": [400,400],
    "material.materialColor": "#ff24e0"
});
api.set(imageShapeId, {"generator.dimensions": [800,800]});
api.set(textId, {
    "text": "Photo by Ben Collins on Unsplash",
    "fontSize": 30,
    "horizontalAlignment": 1,
    "verticalAlignment": 1,
    "position.y": -350,
    "autoWidth": true,
    "autoHeight": true,
    "material.materialColor": "#ffffff"
});
api.set(chromaKeyId, {
    "screenColor": "#009c51",
    "edgeSoftness": 0.7,
    "screenDilate": -0.7,
    "notes": "Disable this Layer to see the original image."
});

// Make the connections.
api.connect(imageShaderId, "id", imageShapeId, "material.colorShaders");
api.connect(chromaKeyId, "id", imageShapeId, "filters");
api.connect(imageAssetId, "id", imageShaderId, "image");

// Parent the Layers.
api.parent(imageShaderId, imageShapeId);

// Refresh UI
api.updateAppTitleBar();