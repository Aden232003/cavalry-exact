// Copyright 2025 Scene Group Ltd.

// 1. Delete unselected Comps (keeping any related pre-comps).
// 2. Remove unused assets (including References), fonts and empty groups.
// 3. Generate an optional report.

// Report setup
const report = {
    deletedComps: [],
    deletedAssets: [],
    deletedFonts: [],
    deletedGroups: []
};

function printSection(title, items) {
    console.log(`\n${title}:`);
    if (items.length === 0) {
        console.log(" - None");
    } else {
        items.forEach(i => console.log(" -", i));
    }
}

function reportSummary() {
    console.log("Scene reduced:");
    printSection("Compositions", report.deletedComps);
    printSection("Assets", report.deletedAssets);
    printSection("Fonts", report.deletedFonts);
    printSection("Empty Groups", report.deletedGroups);
}

// PreComp Collection
function collectAllPreComps(compId, visited, collected) {
    if (visited.has(compId)) return;
    visited.add(compId);

    api.setActiveComp(compId);
    const layers = api.getCompLayers(true);

    layers.forEach(layerId => {
        if (api.getLayerType(layerId) === "compositionReference") {
            const conns = api.getInConnection(layerId, "composition");
            const preComps = Array.isArray(conns) ? conns : [conns];
            preComps.forEach(c => {
                if (!c) return;
                const id = c.replace(/\.id$/, '');
                if (!collected.has(id)) {
                    collected.add(id);
                    collectAllPreComps(id, visited, collected);
                }
            });
        }
    });
}

function collectAllPreCompsFromMultiple(compsArray) {
    const visited = new Set();
    const collected = new Set();
    compsArray.forEach(id => collectAllPreComps(id, visited, collected));
    return Array.from(collected);
}

// Compositions
const selection = api.getSelection();
const allComps = api.getComps();

const selectedCompIds = selection.filter(id => allComps.includes(id));
const allPreComps = collectAllPreCompsFromMultiple(selectedCompIds);
const allRelatedComps = new Set([...selectedCompIds, ...allPreComps]);

const unselectedComps = allComps.filter(c => !allRelatedComps.has(c));

if (selectedCompIds.length > 0) {
    unselectedComps.forEach(compId => {
        report.deletedComps.push(api.getNiceName(compId));
        api.deleteLayer(compId);
    });
}

// Assets & References
const allAssetLayers = api.getAssetWindowLayers();

// Delete unused Assets
function deleteUnusedAssets(allowedTypes, assetLayers) {
    const toDelete = [];

    assetLayers.forEach(layerId => {
        if (api.getLayerType(layerId) !== "asset") return;
        const assetType = api.getAssetType(layerId);
        if (!allowedTypes.includes(assetType)) return;

        if ((api.getOutConnections(layerId, "id") || []).length === 0) {
            toDelete.push(layerId);
        }
    });

    // Delete after collecting
    toDelete.forEach(layerId => {
        report.deletedAssets.push(api.getNiceName(layerId));
        api.deleteLayer(layerId);
    });
}

// Delete unused References

function findReferenceParent(layerId) { // A references Comp's parent can also be a group so find the reference
    let current = layerId;

    while (true) {
        const parent = api.getParent(current);
        if (!parent) return null; // no parent

        const type = api.getAssetType(parent);

        if (type === "reference") {
            return parent;
        }
        // If parent is not a reference continue climbing.
        current = parent;
    }
}

function deleteUnusedReferences() {

    const assetLayers = api.getAssetWindowLayers();
    const compIds = api.getComps();

    const referencesMap = new Map();

    // Build map of all reference parents
    compIds.forEach(compId => {
        const refId = findReferenceParent(compId);
        if (refId) {
            if (!referencesMap.has(refId)) referencesMap.set(refId, []);
            referencesMap.get(refId).push(compId);
        }
    });

    const toDelete = [];

    assetLayers.forEach(layerId => {

        if (api.getLayerType(layerId) !== "asset") return;
        if (api.getAssetType(layerId) !== "reference") return;

        const children = referencesMap.get(layerId) || [];

        const inUse = children.some(childId => {
            const outs = api.getOutConnections(childId, "id") || [];
            return outs.length > 0;
        });

        if (!inUse) {
            toDelete.push(layerId);
        }
    });

    toDelete.forEach(refId => {
        report.deletedAssets.push(api.getNiceName(refId));
        api.deleteLayer(refId);
    });
}

// Fonts
const fontLayerTypes = new Set(["textShape", "applyTypeface", "measureText", "typeface"]);

function collectFontAssets() {
    return api.getAssetWindowLayers()
        .filter(id => api.isFileAsset(id) && api.getAssetType(id) === "font");
}

const fontAssetLayerIds = collectFontAssets();

function getUnusedFontAssets(allComps, fontAssetLayerIds) {
    const fontMap = new Map();
    fontAssetLayerIds.forEach(id => {
        const family = api.getFontAssetFamilyName(id);
        if (family) fontMap.set(family, id);
    });

    const used = new Set();
    let remaining = fontAssetLayerIds.length;

    for (const compId of allComps) {
        if (remaining === 0) break;
        api.setActiveComp(compId);
        const layers = api.getCompLayers(false);

        for (const layerId of layers) {
            if (remaining === 0) break;
            if (fontLayerTypes.has(api.getLayerType(layerId))) {
                const family = api.get(layerId, "font.font");
                const assetId = fontMap.get(family);
                if (assetId && !used.has(assetId)) {
                    used.add(assetId);
                    remaining--;
                }
            }
        }
    }

    return fontAssetLayerIds.filter(id => !used.has(id));
}

function deleteUnusedFontAssets() {
    const unused = getUnusedFontAssets(allComps, fontAssetLayerIds);
    unused.forEach(id => {
        report.deletedFonts.push(api.getFontAssetFamilyName(id) || "Unknown Font");
        api.deleteLayer(id);
    });
}

// Empty groups
function deleteEmptyGroups() {
    const groups = api.getAssetWindowLayers().filter(id => api.getLayerType(id) === "assetGroup");
    groups.forEach(id => {
        if ((api.getChildren(id) || []).length === 0) {
            report.deletedGroups.push(api.getNiceName(id));
            api.deleteLayer(id);
        }
    });
}


// Reduce
const validAssetTypes = ["image", "imageSequence", "imageFolder", "movie", "audio", "audioFolder", "spreadsheet", "svg", "text"];
deleteUnusedAssets(validAssetTypes, allAssetLayers);
deleteUnusedReferences();
deleteUnusedFontAssets();
deleteEmptyGroups();

if (api.isShiftHeld()) {
    reportSummary();
}