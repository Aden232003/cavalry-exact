// Copyright 2025 Scene Group Ltd.

var prefix = "Slide In "
var sel = api.getSelection();
var width = api.get(api.getActiveComp(), "resolution.x");
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }
    let bbox = api.getBoundingBox(layerId, true);
    let distToEdge = -width * .5 - (bbox.x + bbox.width);

    let startFrame = api.getInFrame(layerId);
    let endFrame = startFrame+40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.keyframe(subMeshId, startFrame, {"shapePosition.x": distToEdge});
    api.keyframe(subMeshId, endFrame, {"shapePosition.x": 0});
    api.magicEasing(subMeshId, "shapePosition.x", startFrame, "VerySlowOut");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let staggerId = api.create("stagger", prefix+"Stagger");
    api.set(staggerId, {"minimum": -timeOffset, "maximum": 0});
    api.connect(staggerId, "id", subMeshId, "shapeTimeOffset");
    api.parent(staggerId, layerId);
}