// Copyright 2025 Scene Group Ltd.

// Simple Mesh Shape example.

// Create a new Comp.
var newComp = api.createComp("Mesh Shape");
api.set(newComp, {"backgroundColor": "#ffffff", "resolution": [1080,1080], "fps": 25});
api.setActiveComp(newComp);

// Create the Layers.
var textId = api.create("textShape", "Image Attribution");
var meshId = api.create("meshShape");
var imageShaderId = api.create("imageShader");
// Load an image.
var imageAssetId = api.loadAsset(api.getAppAssetsPath() + "/Presets/Custom Shaders and Filters/pug.png", false);

// Make the Shader a child of the Mesh Shape.
api.parent(imageShaderId, meshId);

// Set the Attributes.
api.addArrayIndex(meshId, "meshVertex");
api.set(meshId, {
    "mesh": true,
    "meshVertex.0.bindPosition.y": 35,
    "notes": "Open the 'Vertex' list under the Mesh tab or use the Mesh tool to add more vertices."
});

api.set(textId, {
    "text": "Photo by charlesdeluvio on Unsplash",
    "fontSize": 30,
    "horizontalAlignment": 1,
    "verticalAlignment": 1,
    "position.y": -350,
    "autoWidth": true,
    "autoHeight": true
});

// Make the connections.
api.connect(imageShaderId, "id", meshId, "material.colorShaders");
api.connect(imageAssetId, "id", imageShaderId, "image");
api.connect(imageShaderId, "outResolution", meshId, "size");

// Set the keyframes.
api.keyframe(meshId, 0, {"meshVertex.0.offset.y": 30});
api.keyframe(meshId, 15, {"meshVertex.0.offset.y": -30});
api.keyframe(meshId, 30, {"meshVertex.0.offset.y": 30});

// Set the interpolation.
var times = api.getKeyframeTimes(meshId,"meshVertex.0.offset.y")
for (let frame of times) {
    // Set the keyframes to bezier interpolation
    api.modifyKeyframe(meshId, {"meshVertex.0.offset.y":{"frame": frame, "type":0}});
}

// Set to loop.
var inConn = api.getInConnection(meshId, "meshVertex.0.offset.y");
var animCurveId = inConn.split('.')[0];
api.set(animCurveId, {"postInfinity": 1});

// Refresh UI
api.select([]);
api.updateAppTitleBar();

// Start playback
api.play();