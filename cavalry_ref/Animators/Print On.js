// Copyright 2025 Scene Group Ltd.

var prefix = "Print On "
var sel = api.getSelection();
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }

    let startFrame = api.getInFrame(layerId);
    let endFrame = startFrame+40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let visibilityId = api.create("visibility", prefix+"Visibility");
    api.keyframe(visibilityId, startFrame, {"end": 0});
    api.keyframe(visibilityId, endFrame, {"end": 100});
    api.connect(visibilityId, "id", subMeshId, "shapeVisibility");
    api.parent(visibilityId, layerId);
}