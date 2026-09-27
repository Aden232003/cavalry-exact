// Copyright 2025 Scene Group Ltd.

// Simple Squash and Stretch example.

// Create a new Comp.
var newComp = api.createComp("Squash and Stretch");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var ellipseId = api.primitive("ellipse", "Ball");
var alignId = api.create("align");
var squashAndStretchId = api.create("squashAndStretch");

// Set the Attributes.
api.set(ellipseId, {"material.materialColor": "#6437ff", "generator.radius": [50,50], "notes": "Try changing the Ellipse's Radius."});
api.set(squashAndStretchId, {"pin": 2, "bulge": 500, "subdivideGeometry": true, "graph.0.right": [0, -0.97], "graph.1.left": [0, 0.27]});
api.set(alignId, {"y": 1});

// To-do - set S&S compound graph.

// Make the connections.
api.connect(alignId, "id", ellipseId, "deformers");
api.connect(squashAndStretchId, "id", ellipseId, "deformers");

// Set the keyframes.
api.keyframe(ellipseId, 0, {"position.y": -250});
api.keyframe(ellipseId, 14, {"position.y": 250});
api.keyframe(ellipseId, 29, {"position.y": -250});
api.keyframe(ellipseId, 31, {"position.y": -250});
api.modifyKeyframeTangent(ellipseId, {"position.y":{"angle":0, "frame": 14, "weight":12}});
api.keyframe(squashAndStretchId, 0, {"amount": -0.3});
api.keyframe(squashAndStretchId, 6, {"amount": 0.07});
api.keyframe(squashAndStretchId, 14, {"amount": 0});
api.keyframe(squashAndStretchId, 26, {"amount": 0.07});
api.keyframe(squashAndStretchId, 30, {"amount": -0.4});
api.keyframe(squashAndStretchId, 31, {"amount": -0.3});
api.modifyKeyframeTangent(squashAndStretchId, {"amount":{"angle":0, "frame": 6, "weight": 4}});
api.modifyKeyframeTangent(squashAndStretchId, {"amount":{"angle":0, "frame": 14, "weight": 3}});
api.modifyKeyframeTangent(squashAndStretchId, {"amount":{"angle":0, "frame": 26, "weight": 3}});
api.modifyKeyframeTangent(squashAndStretchId, {"amount":{"angle":0, "frame": 30, "weight": 0.5}});

// Find the animation curve and set the looping.
var inConn1 = api.getInConnection(ellipseId, "position.y");
var animCurveId1 = inConn1.split('.')[0];
api.set(animCurveId1, {"postInfinity": 1});
var inConn2 = api.getInConnection(squashAndStretchId, "amount");
var animCurveId2 = inConn2.split('.')[0];
api.set(animCurveId2, {"postInfinity": 1});

// Refresh UI
api.select([]);
api.updateAppTitleBar();

// Start playback
api.play();