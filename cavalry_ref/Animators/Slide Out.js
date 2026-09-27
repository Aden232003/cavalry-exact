// Copyright 2025 Scene Group Ltd.

var prefix = "Slide Out "
var sel = api.getSelection();
var width = api.get(api.getActiveComp(), "resolution.x");
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }
    let bbox = api.getBoundingBox(layerId, true);
    let distToEdge = bbox.x * -1 + width * .5;

    let endFrame = api.getOutFrame(layerId)-timeOffset-1;
    let startFrame = endFrame-40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.keyframe(subMeshId, startFrame, {"shapePosition.x": 0});
    api.keyframe(subMeshId, endFrame, {"shapePosition.x": distToEdge});
    api.magicEasing(subMeshId, "shapePosition.x", startFrame, "VerySlowIn");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let staggerId = api.create("stagger", prefix+"Stagger");
    api.set(staggerId, {"minimum": -timeOffset, "maximum": 0});
    api.connect(staggerId, "id", subMeshId, "shapeTimeOffset");
    api.parent(staggerId, layerId);
}