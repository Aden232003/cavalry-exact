// Copyright 2025 Scene Group Ltd.

function loadPreset() {
    if (!api.layerExists(presets.layerId)) {
        console.error("Layer not found: "+presets.layerId)
        return;
    }
    if (!api.filePathExists(presets.filePath)) {
        console.error("Presets file not found: "+presets.filePath)
        return;
    }
    let contents = api.readFromFile(presets.filePath)
    let presetsObj = JSON.parse(contents)
    const result = presetsObj.find(obj => obj.id === presets.presetId)
    if (!result) {
        console.error("No Preset with this id exists: "+presets.presetId)
        return;
    }

    if (presets.resetLayer) {
        // Reset the layer (optionally resetting the transform attributes)
        api.resetLayerAttributes(presets.layerId, result.resetsTransforms)
    }

    // Shape specific settings
    if (api.isShape(presets.layerId)) {
        if (result.shapeInfo.hasFill != api.hasFill(presets.layerId)) {
            api.setFill(presets.layerId, result.shapeInfo.hasFill)
        }
        if (result.shapeInfo.hasStroke != api.hasStroke(presets.layerId)) {
            api.setStroke(presets.layerId, result.shapeInfo.hasStroke)
        }
    }    

    // Set the Generators
    for (generatorInfo of result.generators) {
        const attrId = generatorInfo.genAttrId
        const genType = generatorInfo.type
        const currentType = api.getCurrentGeneratorType(presets.layerId, attrId)
        if (currentType != genType) {
            api.setGenerator(presets.layerId, attrId, genType)
        }
    }

    // Set Attributes
    for (attrInfo of result.attrs) {
        const attrId = attrInfo.attrId
        const value = attrInfo.value

        // First check if this is a compound/ list attribute, and if so, add the required child attributes
        const match = attrId.match(/^(.*)\.(\d+)(?:\..+)?/); 
        if (match) {
            const parentAttribute = match[1]; // Capture group 1 contains everything before the number
            const attrIndex = match[2]; // Capture group 2 contains the number
            const parentDef = api.getAttributeDefinition(presets.layerId, parentAttribute);

            const count = api.getArrayCount(presets.layerId, parentAttribute);

            if (parentDef.isArray) {
                for (let idx = count; idx <= attrIndex; idx++) {
                    api.addArrayIndex(presets.layerId, parentAttribute);
                }
            } else if (parentDef.isDynamic && attrInfo.type) {
                for (let idx = count; idx <= attrIndex; idx++) {
                    api.addDynamic(presets.layerId, parentAttribute, attrInfo.type);
                }
            }
        }

        if (value != null && api.hasAttribute(presets.layerId, attrId)) {
            api.set(presets.layerId, {[attrId]: value})
        }
        if (attrInfo.customName != null) {
            api.renameAttribute(presets.layerId, attrId, attrInfo.customName)
        }
    }
    if (!presets.silent) {
        console.info(result.name+" preset Loaded.")
    }
}
loadPreset()