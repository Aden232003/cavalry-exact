// Copyright 2025 Scene Group Ltd.

// Simple Glow example.

// Create a new Comp.
var newComp = api.createComp("Glow");
api.setActiveComp(newComp);
api.set(newComp, {"backgroundColor": "#000000"});

// Create the Layers.
var textId = api.create("textShape", "GLOW");
var glowId = api.create("glowFilter", "Glow Filter");
var gradId = api.create("gradientShader", "Gradient Shader");

// Set the Attributes.
api.set(textId, {"font":{"font":"Lato", "style":"Black"}, "text": "GLOW", "fontSize": 240, "autoWidth": true, "autoHeight": true,"horizontalAlignment": 1, "verticalAlignment": 1});
api.setFill(textId, false);
api.setStroke(textId, true);
api.set(glowId, {"mode": 1, "blurR": [100,20], "blurB": [50,10], "intensityRGB": [3,1,3]});

api.set(gradId, {"screenSpace": true, "generator.scale": 0.4});
api.setGradientFromColors(gradId, "generator.gradient", ["#6437ff", "#28dbff", "#ff24e0", "#ffff00"]);

// Make the connections.
api.connect(glowId, "id", textId, "filters");
api.connect(gradId, "id", textId, "stroke.colorShaders");

// Refresh UI
api.select([]);
api.updateAppTitleBar();