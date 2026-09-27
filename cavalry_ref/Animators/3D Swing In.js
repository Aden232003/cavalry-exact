// Copyright 2025 Scene Group Ltd.

var prefix = "3D Swing In "
var sel = api.getSelection();

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }

    let startFrame = api.getInFrame(layerId);
    let endFrame = startFrame+40;

    let threeDMatrixId = api.create("3dMatrix", prefix+"Matrix");
    api.keyframe(threeDMatrixId, startFrame, {"rotation.x": 90});
    api.keyframe(threeDMatrixId, endFrame, {"rotation.x": 0});
    api.magicEasing(threeDMatrixId, "rotation.x", startFrame, "SpringOut");
    api.parent(threeDMatrixId, layerId);
    api.connect(threeDMatrixId, "id", layerId, "deformers");
}
