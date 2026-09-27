// Copyright 2025 Scene Group Ltd.

ui.setTitle("Export as Project");
var button = new ui.Button("Export as Project...");
button.setFixedWidth(140);
var modeDropdown = new ui.DropDown();
modeDropdown.addEntry("All Compositions");
modeDropdown.addEntry("Selected Compositions");
var fontCheckboxLabel = new ui.Label("Include Fonts");
fontCheckboxLabel.setToolTip("Include Fonts that have been added to the Scene as Assets.");
var fontCheckbox = new ui.Checkbox(false);
var paletteCheckboxLabel = new ui.Label("Include Palettes");
paletteCheckboxLabel.setToolTip("If a Project is set, any .pal files found in the Palettes directory defined by the Project will be copied to the exported Project.");
var paletteCheckbox = new ui.Checkbox(false);

// Set the onClick callback function
button.onClick = function () {

    // -------Save check--------

    if (api.sceneHasUnsavedChanges() || api.getSceneFilePath() === "") {
        var modal = new ui.Modal();
        var confirm = modal.showQuestion("Unsaved changes.", "This Scene requires saving before exporting.<br><br>Would you like to continue?");
        if (!confirm) {
            return;
        }
        api.saveScene();
    }

    // -------Gather Comps--------

    // Main function that accepts an array of parent comp IDs
    function collectAllPrecompsFromMultiple(compsArray) {
        const visitedComps = new Set();         // Tracks which comps have already been processed (to avoid loops or repeats)
        const collectedPrecomps = new Set();    // Stores all unique precomp Ids found during traversal

        // Loop through each root comp and collect its nested precomps
        compsArray.forEach(function (rootCompId) {
            collectAllPrecomps(rootCompId, visitedComps, collectedPrecomps);
        });

        // Convert the Set to a normal array and return the results
        return Array.from(collectedPrecomps);
    }

    // Recursive function that explores a Comp and finds all nested PreComps
    function collectAllPrecomps(compId, visitedComps, collectedPrecomps) {
        // Skip if this Comp has already been visited
        if (visitedComps.has(compId)) return;
        visitedComps.add(compId);
        // Set the current Comp as active so api.getCompLayers(true) works correctly
        api.setActiveComp(compId);
        // Get all layers in the Comp
        var layerIds = api.getCompLayers(true);
        // Loop through each layer to find any Composition References (i.e. PreComps)
        layerIds.forEach(function (layerId) {
            // Check if this layer is a reference to another Comp
            if (api.getLayerType(layerId) === "compositionReference") {
                // Get the connected Comp(s) — could be a single Id or an array
                var precompId = api.getInConnection(layerId, "composition");
                // Normalize to an array to loop safely
                var precompArray = Array.isArray(precompId) ? precompId : [precompId];
                // Loop through each connected PreComp
                precompArray.forEach(function (connectionString) {
                    if (!connectionString) return;
                    // Strip ".id" to get the actual compId
                    const compId = connectionString.replace(/\.id$/, '');
                    if (!collectedPrecomps.has(compId)) {
                        collectedPrecomps.add(compId);
                        collectAllPrecomps(compId, visitedComps, collectedPrecomps);
                    }
                });
            }
        });
    }

    var selectedCompIds = api.getSelection();
    var allPrecomps = collectAllPrecompsFromMultiple(selectedCompIds);
    // Add to a set to deduplicate (where a selected Comp may also be a Pre-Comp)
    const allComps = modeDropdown.getValue() === 0 ? new Set([...api.getComps()]) : new Set([...selectedCompIds, ...allPrecomps]);

    if (modeDropdown.getValue() === 1 && allComps.size === 0) {
        console.error("Export as Project: No Compositions selected.");
        return;
    }

    // -----Gather Assets------
    function collectAllAssets(compIds) {
        const movies = [];
        const images = [];
        const imageSequences = [];
        const smartFolders = [];

        const allComps = new Set(compIds);

        // Check if an Asset is used in the selected Comps
        const isUsedInComp = layerId => {
            const outs = api.getOutConnections(layerId, "id") || [];
            return outs.some(conn => {
                const targetLayerId = conn.replace(/\..*$/, "");
                const parentComp = api.getParentComp(targetLayerId);
                return allComps.has(parentComp);
            });
        };

        for (const layerId of api.getAssetWindowLayers()) {
            if (!api.isFileAsset(layerId)) continue;
            if (!isUsedInComp(layerId)) continue;

            const type = api.getAssetType(layerId);
            const filePath = api.getAssetFilePath(layerId);
            if (!filePath || !api.filePathExists(filePath)) continue;

            const ext = api.getExtensionFromPath(filePath).toLowerCase();

            if (type === "movie") {
                if ([".mov", ".mp4", ".webm", ".gif", ".apng"].includes(ext)) {
                    movies.push(filePath);
                } else if ([".png", ".jpg", ".jpeg", ".exr", ".webp", ".psd", ".bmp", ".ico"].includes(ext)) {
                    const seqPaths = api.getImageSequenceFilePaths(layerId);
                    if (seqPaths && seqPaths.length > 0) imageSequences.push(...seqPaths);
                }
            } else if (type === "image") {
                images.push(filePath);
            } else if (type === "imageFolder" || type === "audioFolder") {
                smartFolders.push(filePath);
            }
        }

        const allAssetPaths = [...movies, ...images, ...imageSequences, ...smartFolders];

        return { movies, images, imageSequences, smartFolders, allAssetPaths };
    }

    const { allAssetPaths, smartFolders } = collectAllAssets(allComps);


    // Gather optional Font assets

    function collectFontAssets() {
        const layers = api.getAssetWindowLayers()
            .filter(layerId => api.isFileAsset(layerId))
            .filter(layerId => api.getAssetType(layerId) === "font");

        const paths = [];
        const layerIds = [];

        layers.forEach(layerId => {
            const path = api.getAssetFilePath(layerId);
            if (path && path.length > 0 && !paths.includes(path)) {
                paths.push(path);
                layerIds.push(layerId);
            }
        });

        return { paths, layerIds };
    }

    const { paths: fontAssetPaths, layerIds: fontAssetLayerIds } = collectFontAssets();

    function getUsedFontAssets(allComps, fontAssetLayerIds) {
        // Build a lookup map: font family → fontAssetId
        const fontAssetMap = new Map();
        for (const assetId of fontAssetLayerIds) {
            const family = api.getFontAssetFamilyName(assetId);
            if (family) fontAssetMap.set(family, assetId);
        }

        const usedFontAssetsSet = new Set();
        let unmatchedCount = fontAssetLayerIds.length;

        for (let i = 0; i < allComps.length; i++) {
            if (unmatchedCount === 0) break;

            const compId = allComps[i];
            api.setActiveComp(compId); // synchronous

            const layerIds = api.getCompLayers(false);

            for (let j = 0; j < layerIds.length; j++) {
                if (unmatchedCount === 0) break;

                const layerId = layerIds[j];
                const fontLayerTypes = new Set(["textShape", "applyTypeface", "measureText", "typeface"]);
                if (fontLayerTypes.has(api.getLayerType(layerId))) {
                    const textFamily = api.get(layerId, "font.font");

                    if (textFamily && fontAssetMap.has(textFamily) && !usedFontAssetsSet.has(fontAssetMap.get(textFamily))) {
                        const matchedAsset = fontAssetMap.get(textFamily);
                        usedFontAssetsSet.add(matchedAsset);
                        unmatchedCount--;
                    }
                }
            }
        }

        return Array.from(usedFontAssetsSet);
    }

    const allCompsArray = Array.from(allComps);
    const usedFontAssets = getUsedFontAssets(allCompsArray, fontAssetLayerIds);
    console.log("FontAssets actually in use:", usedFontAssets);

    // Convert usedAssets (fontAsset layerIds) to their file paths
    const usedFontAssetPaths = usedFontAssets.map(function (layerId) {
        return api.getAssetFilePath(layerId);
    }).filter(function (path) {
        return path && path.length > 0; // filter out any empty paths
    });


    // Gather optional Palettes

    function extractPalFilenames(paths) {
        return paths.map(path => api.getFileNameFromPath(path, true));
    }

    var getPalettes = api.listDirectoryPaths(api.getPalettesPath());

    var paletteFiles = extractPalFilenames(getPalettes);


    // ------Write a Project directory-------

    const sceneFilePath = api.getSceneFilePath();
    const sceneName = api.getFileNameFromPath(sceneFilePath);

    const directories = ["Assets", "Assets/Palettes", "Autosave", "Renders", "Scenes"];
    const filePath = api.presentChooseFolder(api.getDesktopFolder(), "Export as Project");

    const folderName = sceneName;
    if (api.filePathExists(filePath + "/" + folderName) && folderName !== "") {
        var modal = new ui.Modal();
        var confirm = modal.showQuestion("Overwrite folder?", "A folder with the same name already exists in this location. Export as Project will overwrite its contents.<br><br>Would you like to continue?");
        if (!confirm) {
            return;
        }
        api.makeFolder(filePath + "/" + folderName, true);
    } else {
        api.makeFolder(filePath + "/" + folderName);
    }
    const filePath2 = filePath + "/" + folderName;
    directories.forEach(function (dir) {
        api.makeFolder(filePath2 + "/" + dir);
    });


    // ------Write a Project Description------

    const defaultProject = {
        description: {
            assets: "@project/Assets",
            autoSave: "@project/Autosave",
            name: folderName,
            palettes: "@project/Assets/Palettes",
            renders: "@project/Renders",
            scenes: "@project/Scenes"
        }
    };

    // Serialize the object to a JSON-formatted string
    const jsonString = JSON.stringify(defaultProject, null, 4); // Pretty-print with 4-space indent
    // Write to file
    api.writeToFile(filePath2 + "/projectDescription.json", jsonString);
    // Create the path-to-project file
    api.writeToFile(filePath2 + "/Scenes/path-to-project", "..");

    // ------Copy files-------

    // Assets
    // If an asset is within a Project, match the existing folder structure. If not, add to /Assets

    function copyAssets(assetPaths, destinationRoot) {
        const projectAssetsRoot = api.getAssetPath();    // e.g. "/path/to/project/Assets"
        const projectPath = api.getProjectPath();        // e.g. "/path/to/project" or "" if none

        const sourcePaths = [];
        const destPaths = [];

        // Build Source > Destination mapping
        assetPaths.forEach(sourceFilePath => {
            const fileName = api.getFileNameFromPath(sourceFilePath, true);
            let destinationPath;

            if (projectPath && sourceFilePath.startsWith(projectAssetsRoot + "/")) {
                // When in Assets, copy to a mirrored folder structure
                const relativePath = sourceFilePath.replace(projectAssetsRoot + "/", "");
                destinationPath = destinationRoot + "/" + relativePath;
            } else {
                // When outside Assets copy to /Assets
                destinationPath = destinationRoot + "/" + fileName;
            }

            // Ensure destination folder exists
            const destinationFolder = destinationPath.split("/").slice(0, -1).join("/");
            api.makeFolder(destinationFolder, true);

            // Add to arrays
            sourcePaths.push(sourceFilePath);
            destPaths.push(destinationPath);
        });

        // Copy all files
        for (let i = 0; i < sourcePaths.length; i++) {
            const src = sourcePaths[i];
            const dest = destPaths[i];
            api.copyFilePath(src, dest);
        }
    }

    copyAssets(allAssetPaths, filePath2 + "/Assets");

    // Smart Folder Assets
    function copyFolderRecursive(sourcePath, destinationRoot) {
        const parts = sourcePath.split("/");
        const folderName = parts[parts.length - 1];
        const destinationPath = destinationRoot + "/" + folderName;

        const entries = api.listDirectory(sourcePath);

        entries.forEach(entry => {
            if (api.isFile(entry)) {
                const fileName = entry.split("/").pop();
                api.copyFilePath(entry, destinationPath + "/" + fileName);
            } else if (api.isDirectory(entry)) {
                copyFolderRecursive(entry, destinationPath);
            }
        });
    }

    smartFolders.forEach(rootPath => {
        copyFolderRecursive(rootPath, filePath2 + "/Assets");
    });


    // Fonts
    var fontStatus = "";
    if (fontCheckbox.getValue()) {
        if (usedFontAssetPaths.length === 0) {
            fontStatus = "No Fonts found.";
        } else {
            usedFontAssetPaths.forEach(function (path) {
                api.copyFilePath(path, filePath2 + "/Assets");
            });
            var fontPlural = usedFontAssetPaths.length === 1 ? "Font" : "Fonts";
            fontStatus = usedFontAssetPaths.length + " " + fontPlural + " copied.";
        }
    }

    // Palettes
    var paletteStatus = "";
    if (paletteCheckbox.getValue()) {
        if (paletteFiles.length === 0) {
            paletteStatus = "No Palettes found.";
        } else if (api.getProjectPath()) {
            var palettePlural = paletteFiles.length === 1 ? "Palette" : "Palettes";
            paletteFiles.forEach(function (path) {
                api.copyFilePath(api.getPalettesPath() + "/" + path, filePath2 + "/Assets/Palettes/");
            });
            paletteStatus = paletteFiles.length + " " + palettePlural + " copied.";
        }
    }

    api.select([...allComps, ...usedFontAssets]);
    if (api.exportSelected(filePath2 + "/Scenes/" + sceneName, true)) {
        console.info("Export as Project complete! " + paletteStatus + " " + fontStatus);
    };
};

// Create the UI
ui.add(modeDropdown);
var fontRow = new ui.HLayout();
fontRow.setMargins(0, 1, 0, 2);
fontRow.add(fontCheckboxLabel);
fontRow.add(fontCheckbox);
var paletteRow = new ui.HLayout();
paletteRow.setMargins(0, 1, 0, 2);
paletteRow.add(paletteCheckboxLabel);
paletteRow.add(paletteCheckbox);
ui.add(fontRow);
ui.add(paletteRow);
ui.addStretch();
var buttonRow = new ui.HLayout();
buttonRow.setMargins(0, 1, 0, 2);
buttonRow.addStretch();
buttonRow.add(button);
ui.add(buttonRow);
// Show the window
ui.setMinimumHeight(106);
ui.setMinimumWidth(220);
ui.setMargins(6, 6, 6, 6);
ui.show();