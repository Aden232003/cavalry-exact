// Copyright 2025 Scene Group Ltd.

// Simple Horizontal Layout Group example.

// Create a new Comp.
var newComp = api.createComp("Layout Group");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Shapes
var layout = api.create("layoutGroup");
var ellipse = api.primitive("ellipse", "Ellipse");
var rectangle = api.primitive("rectangle", "Rectangle");
var capsule = api.primitive("capsule", "Capsule");

// Set the sizes and colours.
api.set(capsule, {"generator.radius": [100,100], "material.materialColor": "#c8c8c8"});
api.set(rectangle, {"material.materialColor": "#6437ff"});
api.set(ellipse, {"material.materialColor": "#ff24e0"});
api.disconnectInput(layout, "maximumSize");
api.set(layout, {"maximumSize": [1400,400], "drawExtents": true});

// Add the Shapes to the Layout Group.
api.parent(rectangle, layout);
api.parent(capsule, layout);
api.parent(ellipse, layout);

// Animate the Capsule's Length.
api.keyframe(capsule, 0, {"generator.length": 200});
api.keyframe(capsule, 24, {"generator.length": 400});
api.modifyKeyframeTangent(capsule, {"generator.length":{"angle":0, "frame": 0, "weight":15}});
api.modifyKeyframeTangent(capsule, {"generator.length":{"angle":0, "frame": 24, "weight":15}});

// Find the animation curve and set the looping.
var inConn1 = api.getInConnection(capsule, "generator.length");
var animCurveId1 = inConn1.split('.')[0];
api.set(animCurveId1, {"postInfinity": 4});

// Refresh UI
api.select([]);
api.updateAppTitleBar();