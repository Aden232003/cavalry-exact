// Copyright 2025 Scene Group Ltd.

// Simple Pre-Comp Override example.

// Create the Layers.
var preComp = api.createComp("Pre-Comp");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(preComp);
var frameRect = api.primitive("rectangle", "Frame");
var buttonRect = api.primitive("rectangle", "Button");
var sectionText = api.create("textShape", "Section Text");
var titleText = api.create("textShape", "Title Text");
var buttonText = api.create("textShape", "Button Text");
var alignId = api.create("align");
var dropShadow = api.create("dropShadowFilter");
var bBox = api.create("boundingBox");
var mainComp = api.createComp("Pre-Comp Override");

// Set the Attributes.
api.set(preComp, {"resolution": [300,300], "backgroundColor.a": 0, "niceName": "Pre-Comp"});
api.set(mainComp, {"resolution": [800,400], "backgroundColor": "#c8c8c8",});
api.set(frameRect, {"generator.dimensions": [280,190], "generator.cornerRadius": 5, "material.materialColor": "#6437ff"});
api.set(buttonRect, {"generator.dimensions.y": 34, "position": [-116, -56], "generator.cornerRadius": 5, "material.materialColor": "#ffff00"});
api.set(sectionText, {"position": [-116, 70], "fontSize": 12, "text": "Cavalry | Animation", "autoWidth": true, "autoHeight": true, "material.materialColor": "#ffffff"});
api.set(titleText, {"position": [-116, 48], "fontSize": 18, "autoScaleFontSize": true, "font.style": "Bold", "text": "Pre-Comp Overrides can be used to add variation to a template.", "textBoxSize": [220,60], "material.materialColor": "#ffffff"});
api.set(buttonText, {"position": [-100, -48], "fontSize": 13, "text": "Edit this text", "font.style": "Bold", "autoWidth": true, "autoHeight": true, "material.materialColor": "#000000"});
api.set(alignId, {"x": 1});
api.set(bBox, {"expand.x": 16});

// Make the connections.
api.connect(buttonText, "id", bBox, "inputShapes");
api.connect(alignId, "id", buttonRect, "deformers");
api.connect(bBox, "size.x", buttonRect, "generator.dimensions.x");
api.connect(dropShadow, "id", frameRect, "filters");

// Add the Pre-Comp Overrides
api.addPreCompOverride(buttonText, "text");
api.addPreCompOverride(titleText, "text");
api.addPreCompOverride(buttonRect, "material.materialColor");

// Set the Pre-Comps up
api.setActiveComp(mainComp);
var preCompRef1 = api.createCompReference(preComp);
var preCompRef2 = api.createCompReference(preComp);
api.set(preCompRef1, {"position.x": -180, "niceName": "Pre-Comp 1", "notes": "Double click to load the Overrides tab."});
api.set(preCompRef2, {"position.x": 180, "overrides.2.color": "#ff24e0", "niceName": "Pre-Comp 2", "notes": "Click 'Open' to load the Pre-Comp and edit the original template."});

// Refresh UI
api.select([]);
api.updateAppTitleBar();