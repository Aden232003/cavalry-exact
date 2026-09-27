// Copyright 2025 Scene Group Ltd.

// Simple Component example.

// Create a new Comp.
var newComp = api.createComp("Component");
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#ffffff"});
api.setActiveComp(newComp);

// Create the Layers.
var duplicatorHori = api.create("duplicator", "Horizontal Lines");
var customShapeVert = api.create("customShape", "Vertical Lines");
var lineId = api.create("basicLine");
var modulateId = api.create("modulate");
var calcLineLength = api.create("jsmath", "Calculate Line Length");
var calcCount = api.create("jsmath", "Calculate Count");
var calcSize = api.create("math", "Calculate Size");
var componentId = api.create("component");

// Set the Attributes.
api.setGenerator(duplicatorHori, "generator", "linearDistribution");

api.set(duplicatorHori, {
    "generator.count": 19,
    "generator.size": 50,
    "generator.distributionMode": 1,
    "generator.direction": 1
});

api.set(customShapeVert, {
    "rotation.z": 90
});

api.set(lineId, {
    "generator.divisions": 0
});

api.set(modulateId, {
    "modulateMode": 1,
    "value": 10,
    "offset": 1,
    "notes": "This is connected to the Line's **Stroke Width**."
});

api.addArrayIndex(calcLineLength, "array");

api.set(calcLineLength, {
    "expression": "(n0+1)*n1"
});

api.addArrayIndex(calcCount, "array");
api.addArrayIndex(calcCount, "array");

api.set(calcCount, {
    "expression": "n0*n1+1",
    "array.1": 2,
    "array.2": 10
});

api.set(calcSize, {
    "first": 200,
    "operation": 3 
})

// Rename the attributes that are used in the Component
api.renameAttribute(calcSize, "first", "Unit Size");
api.renameAttribute(calcCount, "array.1", "Unit Count");
api.renameAttribute(calcCount, "array.2", "Divisions");

// Make the connections.
api.connect(duplicatorHori, "id", customShapeVert, "inputShape");
api.connect(lineId, "id", duplicatorHori, "shapes");
api.connect(duplicatorHori, "generator.count", calcLineLength, "array.0");
api.connect(duplicatorHori, "generator.size", calcLineLength, "array.1");
api.connect(calcLineLength, "id", lineId, "generator.length");
api.connect(modulateId, "id", lineId, "stroke.width");
api.connect(modulateId, "value", calcCount, "array.0");
api.connect(modulateId, "value", calcSize, "second");
api.connect(calcCount, "id", duplicatorHori, "generator.count");
api.connect(calcSize, "id", duplicatorHori, "generator.size");
api.connect(calcCount, "array.1", componentId, "promotedAttributes");
api.connect(calcCount, "array.2", componentId, "promotedAttributes");
api.connect(calcSize, "first", componentId, "promotedAttributes");
api.connect(calcCount, "array.2", modulateId, "value");

// Parent everything under the Component
api.parent(duplicatorHori, componentId);
api.parent(customShapeVert, componentId);
api.parent(lineId, componentId);
api.parent(modulateId, componentId);
api.parent(calcLineLength, componentId);
api.parent(calcCount, componentId);
api.parent(calcSize, componentId);

//Set the Component's UI state
api.set(componentId, {
    "compactLayout": true
});
api.editComponent(componentId, false);

// Refresh UI
api.select([]);
api.updateAppTitleBar();