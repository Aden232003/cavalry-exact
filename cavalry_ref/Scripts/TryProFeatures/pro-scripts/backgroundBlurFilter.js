// Copyright 2025 Scene Group Ltd.

// Simple Background Blur Filter example.

// Create a new Comp.
var newComp = api.createComp("Background Blur Filter");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var textId = api.create("textShape", "Image Attribution");
var rectId = api.primitive("rectangle", "Abstract Image");
var imageShaderId = api.create("imageShader");
var ellipseId = api.primitive("ellipse", "Ellipse");
var bgBlurId = api.create("backgroundBlurFilter");

// Load an image.
var imageAssetId = api.loadAsset(ui.scriptLocation + "/pro_assets/abstract.jpg", false);

// Set the Attributes.
api.setStroke(ellipseId, true);
api.set(ellipseId, {
    "position": [240, 120],
    "generator.radius": [200,200],
    "stroke.strokeColor": "#ffffff",
    "stroke.width": 4,
    "opacity": 10,
    "blendMode": 2});
api.set(rectId, {"generator.dimensions": [640,360]});
api.set(textId, {
    "text": "Photo by Alex Shuper on Unsplash",
    "fontSize": 30,
    "horizontalAlignment": 1,
    "verticalAlignment": 1,
    "position.y": -350,
    "autoWidth": true,
    "autoHeight": true
});

// Make the connections.
api.connect(ellipseId, "id", bgBlurId, "inputShape");
api.connect(bgBlurId, "id", rectId, "filters");
api.connect(imageShaderId, "id", rectId, "material.colorShaders");
api.connect(imageAssetId, "id", imageShaderId, "image");

// Refresh UI
api.select([]);
api.updateAppTitleBar();