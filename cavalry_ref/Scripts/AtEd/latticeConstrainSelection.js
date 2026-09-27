// Copyright 2025 Scene Group Ltd.

// Constrain selected lattice control points
const layerId = atEd.layerId;

// Helper function to get selected lattice point indices
function getLatticeSelection(latticeLayerId) {
    let selectedAttrs = api.getSelectedAttributes();
    let indices = [];

    for (let attr of selectedAttrs) {
        // attr is a 2-element array: [nodeId, attrPath]
        let nodeId = attr[0];
        let attrPath = attr[1];

        if (nodeId === latticeLayerId && attrPath.startsWith("controlPointOffsets.")) {
            let parts = attrPath.split(".");
            if (parts.length === 2) {
                let index = parseInt(parts[1]);
                if (!isNaN(index)) {
                    indices.push(index);
                }
            }
        }
    }

    return indices.sort((a, b) => a - b);
}

// Get selected control points
let selection = getLatticeSelection(layerId);

if (selection.length === 0) {
    console.log("No lattice control points selected.");
} else {
    // Create new lattice constraint
    let constraintId = api.create("latticeController", "Lattice Controller", false);

    // Connect constraint to lattice
    api.connect(constraintId, "id", layerId, "controllers");

    // Set the controlled points on the constraint
    api.set(constraintId, {"controlledPoints": selection});

    console.log("Created constraint for " + selection.length + " control point(s)");
}
