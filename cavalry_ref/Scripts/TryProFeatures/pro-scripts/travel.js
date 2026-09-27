// Copyright 2025 Scene Group Ltd.

// Simple Travel Deformer example.

// Create a new Comp.
var newComp = api.createComp("Travel");
api.setActiveComp(newComp);
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#c8c8c8"});

// Create the Layers.
var ringId = api.primitive("ring", "Ring");
var travelId = api.create("travel");

// Set the Attributes.
api.setStroke(ringId, true);
api.set(ringId, {"generator.radius": 200, "generator.width": 120, "material.materialColor": "#ffff00", "stroke.strokeColor": "#ff24e0", "stroke.width": 50, "stroke.capStyle": 1, "stroke.taperedWidth": true});
api.set(travelId, {"notes": "The Travel Deformer is used to push the tapered stroke around the Shape, something that's not possible with Trim set to Start/End = 0/100."});

// Make the connection.
api.connect(travelId, "id", ringId, "deformers");

// Set the keyframes.
api.keyframe(travelId, 0, {"travel": 0});
api.keyframe(travelId, 49, {"travel": 99});

// Find the animation curve and set the looping.
var inConn = api.getInConnection(travelId, "travel");
var animCurveId = inConn.split('.')[0];
api.set(animCurveId, {"postInfinity": 1});

// Refresh UI
api.select([]);
api.updateAppTitleBar();