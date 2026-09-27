// Copyright 2025 Scene Group Ltd.

var prefix = "Fall Out "
var sel = api.getSelection();
var height = api.get(api.getActiveComp(), "resolution.y");
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }
    let bbox = api.getBoundingBox(layerId, true);
    let distToEdge = -height * .5 - (bbox.y + bbox.height);

    let endFrame = api.getOutFrame(layerId)-timeOffset-1;
    let startFrame = endFrame-40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.keyframe(subMeshId, startFrame, {"shapePosition.y": 0});
    api.keyframe(subMeshId, endFrame, {"shapePosition.y": distToEdge});
    api.magicEasing(subMeshId, "shapePosition.y", startFrame, "VerySlowIn");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let staggerId = api.create("stagger", prefix+"Stagger");
    api.set(staggerId, {"minimum": -timeOffset, "maximum": 0});
    api.connect(staggerId, "id", subMeshId, "shapeTimeOffset");
    api.parent(staggerId, layerId);
}