// Copyright 2025 Scene Group Ltd.

// Keyframe selected lattice control points
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
    // Get current frame
    let frame = api.getFrame();

    // Build keyframe data for both .x and .y of each selected point
    let keyframeData = {};
    for (let idx of selection) {
        let xPath = "controlPointOffsets." + idx + ".x";
        let yPath = "controlPointOffsets." + idx + ".y";

        // Get current values
        let xValue = api.get(layerId, xPath);
        let yValue = api.get(layerId, yPath);

        keyframeData[xPath] = xValue;
        keyframeData[yPath] = yValue;
    }

    // Set keyframes
    api.keyframe(layerId, frame, keyframeData);

    console.log("Keyframed " + selection.length + " control point(s) at frame " + frame);
}
