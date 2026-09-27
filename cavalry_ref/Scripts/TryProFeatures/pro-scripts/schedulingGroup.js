// Copyright 2025 Scene Group Ltd.

// Simple Scheduling Group example.

// Create a new Comp.
var newComp = api.createComp("Scheduling Group");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Shapes
var schedule = api.create("schedulingGroup");
api.set(schedule, {"sequencing": true, "orderingPolicy": 1, "notes": "Try adjusting a Layer's length in the Time Editor."});

var shapes = [];

for (var i = 0; i < 5; i++) {
  // Create 5 Rectangles and set their duration.
  var rect = api.primitive("rectangle", "Shape"+(i+1));
  shapes.push(rect);
  api.set(rect, {"material.materialColor": "#6437ff", "material.materialColor.a": 255-(i*30)})
  api.setOutFrame(rect, 24);
}

// Parent each Shape to the Scheduling Group
shapes.forEach((shape) => {
  api.parent(shape, schedule);
});

// Refresh UI
api.select([]);
api.updateAppTitleBar();