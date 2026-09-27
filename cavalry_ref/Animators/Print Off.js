// Copyright 2025 Scene Group Ltd.

var prefix = "Print Off "
var sel = api.getSelection();
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }

    let endFrame = api.getOutFrame(layerId)-timeOffset-1;
    let startFrame = endFrame-40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let visibilityId = api.create("visibility", prefix+"Visibility");
    api.keyframe(visibilityId, startFrame, {"start": 0});
    api.keyframe(visibilityId, endFrame, {"start": 100});
    api.connect(visibilityId, "id", subMeshId, "shapeVisibility");
    api.parent(visibilityId, layerId);
}