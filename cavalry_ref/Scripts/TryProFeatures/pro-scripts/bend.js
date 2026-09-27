// Copyright 2025 Scene Group Ltd.

// Simple Bend Deformer example.

// Create a new Comp.
var newComp = api.createComp("Bend");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var rectId = api.primitive("rectangle", "Rectangle");
var bendId = api.create("bend");

// Set the Attributes.
api.setFill(rectId, false);
api.setStroke(rectId, true);
api.set(rectId, {"generator.dimensions": [100,400], "stroke.strokeColor": "#6437ff", "stroke.width": 20, "generator.cornerRadius": 10});
api.set(bendId, {"direction": 1, "verticalPin": 2, "highQuality": true});

// Make the connection.
api.connect(bendId, "id", rectId, "deformers");

// Set the keyframes.
api.keyframe(bendId, 0, {"bendAngle": 40});
api.keyframe(bendId, 24, {"bendAngle": -40});
api.keyframe(bendId, 49, {"bendAngle": 40});
api.modifyKeyframeTangent(bendId, {"bendAngle":{"angle":0, "frame": 0, "weight":15}});
api.modifyKeyframeTangent(bendId, {"bendAngle":{"angle":0, "frame": 24, "weight":15}});
api.modifyKeyframeTangent(bendId, {"bendAngle":{"angle":0, "frame": 49, "weight":15}});

// Find the animation curve and set the looping.
var inConn = api.getInConnection(bendId, "bendAngle");
var animCurveId = inConn.split('.')[0];
api.set(animCurveId, {"postInfinity": 1});

// Refresh UI
api.select([]);
api.updateAppTitleBar();