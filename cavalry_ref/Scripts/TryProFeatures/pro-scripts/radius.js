// Copyright 2025 Scene Group Ltd.

// Simple Radius example.

// Create a new Comp.
var newComp = api.createComp("Radius");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var ellipse2 = api.primitive("ellipse", "Shape 2");
var ellipse1 = api.primitive("ellipse", "Shape 1");
var ellipse3 = api.primitive("ellipse", "Resulting Ellipse");
var radiusId = api.create("radius");

// Set the Attributes.
api.set(ellipse1, {"position": [-250,-25], "material.materialColor": "#6437ff", "generator.radius": [50,50], "notes": "Move this Shape."});
api.set(ellipse2, {"position": [250,100], "material.materialColor": "#6437ff", "generator.radius": [50,50], "notes": "Move this Shape."});
api.setFill(ellipse3, false);
api.setStroke(ellipse3, true);
api.set(ellipse3, {"notes": "This Shape's position is driven by the Radius' 'Centre Position' attribute."});
api.set(radiusId, {"centreMode": 1, "notes": "Centre Mode is set to 'Shapes' Centre'."});

// Make the connections.
api.connect(ellipse1, "id", radiusId, "inputShapes");
api.connect(ellipse2, "id", radiusId, "inputShapes");
api.connect(radiusId, "centrePosition", ellipse3, "position");
api.connect(radiusId, "id", ellipse3, "generator.radius");

// Refresh UI
api.select([]);
api.updateAppTitleBar();