// Copyright 2025 Scene Group Ltd.

var prefix = "3D Swing Out "
var sel = api.getSelection();
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }

    let endFrame = api.getOutFrame(layerId)-timeOffset-1;
    let startFrame = endFrame-40;

    let threeDMatrixId = api.create("3dMatrix", prefix+"Matrix");
    api.keyframe(threeDMatrixId, startFrame, {"rotation.x": 0});
    api.keyframe(threeDMatrixId, endFrame, {"rotation.x": 90});
    api.magicEasing(threeDMatrixId, "rotation.x", startFrame, "VerySlowOut");
    api.parent(threeDMatrixId, layerId);
    api.connect(threeDMatrixId, "id", layerId, "deformers");
}
