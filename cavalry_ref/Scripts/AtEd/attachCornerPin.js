// Copyright 2025 Scene Group Ltd.

let sel = api.getSelection();

let shapeId = "";
for (layerId of sel) {
	if (api.isShape(layerId) && api.getLayerType(layerId) != "cornerPinShape") {
		shapeId = layerId;
		break;
	}
}

if (shapeId) {
	api.centrePivot(shapeId, false);
	const bbox = api.getBoundingBox(shapeId, true);

	api.set(shapeId, {"position":{"x":0, "y":0}});
	api.set(atEd.layerId, {"bind": false, "position":{"x":0, "y":0}, "size": {"x": bbox.width, "y":bbox.height}});

    // Get the in connections (layerId.attributeId) and split out everything except the layerId.
	let topLeft = api.getInConnection(atEd.layerId, "topLeft");
	topLeft = topLeft.split('.')[0];
	let topRight = api.getInConnection(atEd.layerId, "topRight");
	topRight = topRight.split('.')[0];
	let bottomLeft = api.getInConnection(atEd.layerId, "bottomLeft");
	bottomLeft = bottomLeft.split('.')[0];
	let bottomRight = api.getInConnection(atEd.layerId, "bottomRight");
	bottomRight = bottomRight.split('.')[0];

	api.set(topLeft, {"position.x": bbox.left, "position.y": bbox.top});
	api.set(topRight, {"position.x": bbox.right, "position.y": bbox.top});
	api.set(bottomLeft, {"position.x": bbox.left, "position.y": bbox.bottom});
	api.set(bottomRight, {"position.x": bbox.right, "position.y": bbox.bottom});

	api.parent(shapeId, atEd.layerId);

	api.set(atEd.layerId, {"bind": true});
} else {
	console.log("Please select a Shape layer to use this utility.");
}

