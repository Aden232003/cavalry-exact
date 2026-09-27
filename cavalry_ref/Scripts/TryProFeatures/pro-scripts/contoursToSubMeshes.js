// Copyright 2025 Scene Group Ltd.

// Simple Contours to Sub-Meshes example.

// Create a new Comp.
var newComp = api.createComp("Contours to Sub-Meshes");
api.setActiveComp(newComp);
api.set(newComp, {"backgroundColor": "#c8c8c8", "resolution": [1080,1080]});

var path = new cavalry.Path(); // Define the Path
path.moveTo(-300, 100);
path.cubicTo(-355.228485, 100, -400, 55.2284737, -400, 0);
path.cubicTo(-400, -55.2284737, -355.228485, -100, -300, -100);
path.cubicTo(-244.77153, -100, -200, -55.2284737, -200, 0);
path.cubicTo(-200, 55.2284737, -244.77153, 100, -300, 100);
path.close();
path.moveTo(0, 100);
path.cubicTo(-55.2284737, 100, -100, 55.2284737, -100, 0);
path.cubicTo(-100, -55.2284737, -55.2284737, -100, 0, -100);
path.cubicTo(55.2284737, -100, 100, -55.2284737, 100, 0);
path.cubicTo(100, 55.2284737, 55.2284737, 100, 0, 100);
path.close();
path.moveTo(300, 100);
path.cubicTo(244.77153, 100, 200, 55.2284737, 200, 0);
path.cubicTo(200, -55.2284737, 244.77153, -100, 300, -100);
path.cubicTo(355.228485, -100, 400, -55.2284737, 400, 0);
path.cubicTo(400, 55.2284737, 355.228485, 100, 300, 100);
path.close();

// Create the Layers.
var pathId = api.createEditable(path, "Editable Shape");
var ctsmId = api.create("contoursToSubMeshes");
var subMeshId = api.create("subMesh");
var colArrayId = api.create("colorArray");

// Set the Attributes.
api.addArrayIndex(colArrayId, "array");
api.addArrayIndex(colArrayId, "array");
api.setFill(subMeshId, true);
api.set(subMeshId, {
    "levelMode": 1
});
api.set(colArrayId, {
    "array.1": "#ffff00",
    "array.2": "#6437ff"
});
api.set(ctsmId, {
    "notes": "Connecting this to the Shape as a Deformer before the Sub-Mesh allows the Color Array to affect each Contour."
});

// Make the connections.
api.connect(ctsmId, "id", pathId, "deformers");
api.connect(colArrayId, "id", subMeshId, "material.materialColor");
api.connect(subMeshId, "id", pathId, "deformers");

// Refresh UI
api.select([]);
api.updateAppTitleBar();
