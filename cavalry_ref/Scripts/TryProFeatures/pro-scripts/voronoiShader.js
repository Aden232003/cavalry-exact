// Copyright 2025 Scene Group Ltd.

// Simple Voronoi Shader example.

// Create a new Comp.
var newComp = api.createComp("Voronoi");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers
var ellipseId = api.primitive("ellipse", "Ellipse");
var voronoiId = api.create("voronoiShader");

// Set the sizes and colours.
api.set(ellipseId, {"generator.radius": [200,200]});

// Connect the Layers.
api.connect(voronoiId, "id", ellipseId, "material.colorShaders");

// Refresh UI
api.select([]);
api.updateAppTitleBar();