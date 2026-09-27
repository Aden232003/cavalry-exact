// Copyright 2025 Scene Group Ltd.

function deletePreset() {
    if (!api.filePathExists(presets.filePath)) {
        console.error("Presets file not found: " + presets.filePath);
        return;
    }

    let contents = api.readFromFile(presets.filePath);
    let presetsObj = JSON.parse(contents);

    // Find the index of the preset with the matching presetId
    const index = presetsObj.findIndex(obj => obj.id === presets.presetId);
    if (index === -1) {
        console.error("No Preset with this id exists: " + presets.presetId);
        return;
    }

    // Remove the preset from the array
    const deletedPreset = presetsObj.splice(index, 1);

    // Resave the updated presets array to the file
    api.writeToFile(presets.filePath, JSON.stringify(presetsObj, null, 2), true);

    console.info(deletedPreset[0].name + " preset deleted.");
}

deletePreset();