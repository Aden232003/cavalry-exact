// Copyright 2025 Scene Group Ltd.

// Reset all lattice control point offsets to zero
const layerId = atEd.layerId;

// Get all child attributes of controlPointOffsets
const children = api.getAttrChildren(layerId, "controlPointOffsets");

// Reset each control point offset to {x: 0, y: 0}
for (let i = 0; i < children.length; i++) {
    api.set(layerId, {[children[i]]: {"x": 0, "y": 0}});
}
