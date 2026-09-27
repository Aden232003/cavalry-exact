// Copyright 2025 Scene Group Ltd.

function renamePreset() {
    if (!api.filePathExists(presets.filePath)) {
        console.error("Presets file not found: " + presets.filePath);
        return;
    }

    let contents = api.readFromFile(presets.filePath);
    let presetsObj = JSON.parse(contents);

    // Find the preset with the matching presetId
    const preset = presetsObj.find(obj => obj.id === presets.presetId);
    if (!preset) {
        console.error("No Preset with this id exists: " + presets.presetId);
        return;
    }

    const oldName = preset.name;
    preset.name = presets.newName;

    // Resave the updated presets array to the file
    api.writeToFile(presets.filePath, JSON.stringify(presetsObj, null, 2), true);

    console.info(`Preset renamed from "${oldName}" to "${preset.name}".`);
}

renamePreset();