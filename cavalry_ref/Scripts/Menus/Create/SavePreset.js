// Copyright 2025 Scene Group Ltd.

function savePreset(layerId) {
    if (!api.exists(layerId)) {
        return;
    }
    let layerType = api.getLayerType(layerId)
    if (presets.superType) {
        const supers = api.getSuperTypes(layerId);
        if (supers.length > 1) {
            // [0] is this layer type, [1] is the parent type
            // e.g for a basicShape, the parent type is shape
            // this means this preset will be available for all shapes
            layerType = supers[1]
        }
    }
    const attrIds = api.getAttributes(layerId)
    let output = {
        presetType: "layer",
        id: api.uuid(),
        name: presets.presetName,
        layerType: layerType,
        attrs: [], 
        generators: [],
        shapeInfo: {},
        resetsTransforms: presets.includeTransforms,
        resetsLayer: presets.resetLayer
    };

    const isShape = api.isShape(layerId)

    const transformAttrs = ["position", "scale", "rotation", "pivot"]

    const processAttribute = (layerId, attrId, listChild = false) => {
        const def = api.getAttributeDefinition(layerId, attrId)

        // Don't save read-only/output attributes
        if (def.isAttrReadOnly) {
            return;
        }

        // Handle array attributes by recursing into individual indices
        if (def.isArray || def.isDynamic) {
            const arrayCount = api.getArrayCount(layerId, attrId);
            for (let idx = 0; idx < arrayCount; idx++) {
                processAttribute(layerId, `${attrId}.${idx}`, true);
            }
            return;
        } else if (def.isCompound) {
            for (const child of def.children) {
                processAttribute(layerId, `${attrId}.${child.attrId}`);
            }
            return;
        }

        const type = def.type
        // Process individual attribute (skip default attrs UNLESS dynamic/ list child)
        if (!api.isAttrDefault(layerId, attrId) || listChild) {
            if (isShape && !presets.includeTransforms) {
                if (transformAttrs.includes(attrId)) {
                    return;
                }
            }
            if (layerType === "basicShape" && !presets.includePrimitive && attrId.startsWith("generator")) {
                return;
            }
            if (api.getSuperTypes(layerId).includes("editableShape") && !presets.includePath && attrId === "inputPath") {
                return;
            }
            if (layerType === "renderQueueItem" && !presets.includeRqiPath && (attrId === "fileName" || attrId === "filePath")) {
                return;
            }
            const value = api.get(layerId, attrId);
            if (value != null) {
                if (api.hasCustomAttributeName(layerId, attrId)) {
                    const customName = api.getCustomAttributeName(layerId, attrId);
                    output.attrs.push({ attrId, value, customName, type });
                } else {
                    output.attrs.push({ attrId, value, type });
                }
            }
        }
    };

    for (attrId of attrIds) {
        processAttribute(layerId, attrId);
    }

    const generators = api.getGenerators(layerId)
    for (genAttrId of generators) {
        /// We can skip the shape generator for primitives
        if (layerType === "basicShape" && !presets.includePrimitive && genAttrId === "generator") {
            continue;
        }
        const type = api.getCurrentGeneratorType(layerId, genAttrId)
        if (type.length) {
            output.generators.push({genAttrId,type})
        }
    }
    if (isShape) {
        output.shapeInfo.hasFill = api.hasFill(layerId)
        output.shapeInfo.hasStroke = api.hasStroke(layerId)
    }    

    if (!api.filePathExists(api.getPresetsPath())) {
        api.makeFolder(api.getPresetsPath())
    }
    const defaultPresetFile = api.getPresetsPath() + "/presets.json"
    if (!api.filePathExists(defaultPresetFile)) {
        let presets = [output]
        api.writeToFile(defaultPresetFile, JSON.stringify(presets, null, 2))
    } else {
        let contents = api.readFromFile(defaultPresetFile)
        let presets = JSON.parse(contents)
        presets.push(output)
        api.writeToFile(defaultPresetFile, JSON.stringify(presets, null, 2), true)
    }
    console.info(output.name+" preset Saved.")
}

savePreset(presets.layerId)