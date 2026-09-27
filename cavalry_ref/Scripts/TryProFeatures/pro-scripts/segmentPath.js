// Copyright 2025 Scene Group Ltd.

// Simple Segment Path example.

// Create a new Comp.
var newComp = api.createComp("Segment Path");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var ellipseId = api.primitive("ellipse", "Ellipse");
var segmentId = api.create("segmentPath");
var subMeshId = api.create("subMesh");
var arrayId = api.create("colorArray");

// Set the Attributes.
api.setFill(ellipseId, false);
api.setStroke(ellipseId, true);
api.setStroke(subMeshId, true);
api.set(subMeshId, {"levelMode": 1, "stroke.width": 20});
api.addArrayIndex(arrayId, "array");
api.set(arrayId, {"array.0": "#4ffd7a", "array.1": "#6437ff"});
api.set(ellipseId, {"hidden": true});

// Make the connections.
api.connect(ellipseId, "id", segmentId, "inputShapes");
api.connect(subMeshId, "id", segmentId, "deformers");
api.connect(arrayId, "id", subMeshId, "stroke.strokeColor");

// Refresh UI
api.select([]);
api.updateAppTitleBar();