// Copyright 2025 Scene Group Ltd.

let sel = api.getSelection();

function proceed() {
    for (const layerId of sel) {
        // If we find a shape...
        if (api.isShape(layerId)) {
            // Where nothing is connected to it's position attributes...
            if (!api.getInConnection(layerId, "position") &&
                !api.getInConnection(layerId, "position.x") &&            
                !api.getInConnection(layerId, "position.y") &&
                !api.getInConnection(layerId, "position.z")) {
                // We can proceed...
                return true;
            }
        }
    }
    console.error("Pre-Compose Based on Selection Bounds doesn't work on Shapes with position input connections.")
    return false;
}

if (proceed()) {
    // Get the bounding box of the selection
    const bbox = api.getSelectionBoundingBox();

    // Move all our layers toward the comp centre so they will appear at the centre of the new composition
    api.move(-bbox.centre.x, -bbox.centre.y);

    // Precompose the layers
    const precompId = api.preCompose();
    // Set the compoisition resolution to match our bounding box
    const compId = api.getCompFromReference(precompId);
    api.set(compId, {"resolution.x": bbox.width, "resolution.y": bbox.height});

    // Move the precomposition so that our layers appear where they were originally
    api.set(precompId, {"position": bbox.centre});

    console.info("Pre-Composed " + sel.length + " items.");
}