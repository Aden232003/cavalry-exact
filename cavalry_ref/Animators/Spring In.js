// Copyright 2025 Scene Group Ltd.

var prefix = "Spring In "
var sel = api.getSelection();
var height = api.get(api.getActiveComp(), "resolution.y");
var timeOffset = 20;

for (let layerId of sel) {
    if (!api.hasAttribute(layerId, "deformers")) {
        continue;
    }
    let bbox = api.getBoundingBox(layerId, true);
    let distToEdge = bbox.y * -1 + height * .5;

    let startFrame = api.getInFrame(layerId);
    let endFrame = startFrame+40;

    let subMeshId = api.create("subMesh", prefix+"Animator");
    api.keyframe(subMeshId, startFrame, {"shapePosition.y": distToEdge});
    api.keyframe(subMeshId, endFrame, {"shapePosition.y": 0});
    api.magicEasing(subMeshId, "shapePosition.y", startFrame, "SpringOut");
    api.connect(subMeshId, "id", layerId, "deformers");
    api.parent(subMeshId, layerId);

    let staggerId = api.create("stagger", prefix+"Stagger");
    api.set(staggerId, {"minimum": -timeOffset, "maximum": 0});
    api.connect(staggerId, "id", subMeshId, "shapeTimeOffset");
    api.parent(staggerId, layerId);
}