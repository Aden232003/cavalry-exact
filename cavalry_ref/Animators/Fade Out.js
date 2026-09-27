// Copyright 2025 Scene Group Ltd.

var prefix = "Fade Out "
var sel = api.getSelection();
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }

    let endFrame = api.getOutFrame(layerId)-timeOffset-1;
    let startFrame = endFrame-40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.keyframe(subMeshId, startFrame, {"shapeOpacity": 100});
    api.keyframe(subMeshId, endFrame, {"shapeOpacity": 0});
    api.magicEasing(subMeshId, "shapeOpacity", startFrame, "SlowOut");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.set(subMeshId, {"opacityMode": 1});
    api.parent(subMeshId, layerId);

    let staggerId = api.create("stagger", prefix+"Stagger");
    api.set(staggerId, {"minimum": -timeOffset, "maximum": 0});
    api.connect(staggerId, "id", subMeshId, "shapeTimeOffset");
    api.flipGraph(staggerId, "graph", "vertical");
    api.parent(staggerId, layerId);
}