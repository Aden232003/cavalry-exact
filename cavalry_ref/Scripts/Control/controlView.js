// Copyright 2025 Scene Group Ltd.

const dMargins = 4
const dInnerCornerRounding = 6
const dFontSize = 14
const dFieldWidth = 64
const dRowBackgroundColor = "#383838"
const dMainLayoutSpacing = 6
const dFlowLayoutHSpacing = 15
const dFlowLayoutVSpacing = 7

function getControlTitleWidget(layerId, attrId) {
    const rowLabel = new ui.Label(api.getAttributeNiceName(layerId,attrId))
    rowLabel.setFontSize(dFontSize)
    rowLabel.setTextColor("#eaeaea")
    return rowLabel
}

function buildContainer(layout) {
    const container = new ui.Container()
    container.setBackgroundColor(dRowBackgroundColor)
    container.setRadius(dInnerCornerRounding,dInnerCornerRounding,dInnerCornerRounding,dInnerCornerRounding)
    container.setLayout(layout)
    return container
}

function buildNumericWithPrefix(isDouble, def) {
    const step = def.numericInfo?.step ?? 1.0;
    const numeric = new ui.NumericField(0)
    if (isDouble) {
        numeric.setType(1)
    } else {
        numeric.setType(0)
    }
    numeric.setStep(step)
    numeric.setFontSize(dFontSize)
    numeric.setFixedHeight(18)
    numeric.setFixedWidth(dFieldWidth)
    if (def.numericInfo?.hardMin !== undefined) {
        numeric.setMin(def.numericInfo?.hardMin);
    }
    if (def.numericInfo?.hardMax !== undefined) {
        numeric.setMax(def.numericInfo?.hardMax);
    }
    return numeric
}


function buildNumeric2Control(vLayout, layerId, attrId, definition) {
    const title = getControlTitleWidget(layerId, attrId)

    if (definition.children.length < 2) {
        return
    }

    const xDef = definition.children[0]
    const yDef = definition.children[1]
    const isDouble = definition.type === "double2"
    const numericX = buildNumericWithPrefix(isDouble, xDef)
    const numericY = buildNumericWithPrefix(isDouble, yDef)

    const layout = new ui.HLayout()
    layout.add(title)
    layout.add(numericX)
    layout.add(numericY)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    numericX.setValue(api.get(layerId, attrId+".x"))

    numericX.onValueChanged = function() {
        const numValue = numericX.getValue()
        api.set(layerId, {[attrId+".x"]: numValue})
    }

    numericY.setValue(api.get(layerId, attrId+".y"))

    numericY.onValueChanged = function() {
        const numValue = numericY.getValue()
        api.set(layerId, {[attrId+".y"]: numValue})
    }

    numericX.bindAttr(layerId, attrId+".x")
    numericY.bindAttr(layerId, attrId+".y")
}

function buildNumeric3Control(vLayout, layerId, attrId, definition) {
    const title = getControlTitleWidget(layerId, attrId)

    if (definition.children.length < 3) {
        return
    }

    const xDef = definition.children[0]
    const yDef = definition.children[1]
    const zDef = definition.children[2]

    const isDouble = definition.type === "double3"
    const numericX = buildNumericWithPrefix(isDouble, xDef)
    const numericY = buildNumericWithPrefix(isDouble, yDef)
    const numericZ = buildNumericWithPrefix(isDouble, zDef)

    const layout = new ui.HLayout()
    layout.add(title)
    layout.add(numericX)
    layout.add(numericY)
    layout.add(numericZ)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    numericX.setValue(api.get(layerId, attrId+".x"))

    numericX.onValueChanged = function() {
        const numValue = numericX.getValue()
        api.set(layerId, {[attrId+".x"]: numValue})
    }

    numericY.setValue(api.get(layerId, attrId+".y"))

    numericY.onValueChanged = function() {
        const numValue = numericY.getValue()
        api.set(layerId, {[attrId+".y"]: numValue})
    }

    numericZ.setValue(api.get(layerId, attrId+".z"))

    numericZ.onValueChanged = function() {
        const numValue = numericZ.getValue()
        api.set(layerId, {[attrId+".z"]: numValue})
    }

    numericX.bindAttr(layerId, attrId+".x")
    numericY.bindAttr(layerId, attrId+".y")
    numericZ.bindAttr(layerId, attrId+".z")
}

function buildNumeric4Control(vLayout, layerId, attrId, definition) {
    const title = getControlTitleWidget(layerId, attrId)

    if (definition.children.length < 4) {
        return
    }

    const xDef = definition.children[0]
    const yDef = definition.children[1]
    const zDef = definition.children[2]
    const wDef = definition.children[3]

    const isDouble = definition.type === "double4"
    const numericX = buildNumericWithPrefix(isDouble, xDef)
    const numericY = buildNumericWithPrefix(isDouble, yDef)
    const numericZ = buildNumericWithPrefix(isDouble, zDef)
    const numericW = buildNumericWithPrefix(isDouble, wDef)

    const layout = new ui.HLayout()
    layout.add(title)
    layout.add(numericX)
    layout.add(numericY)
    layout.add(numericZ)
    layout.add(numericW)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    numericX.setValue(api.get(layerId, attrId+".x"))

    numericX.onValueChanged = function() {
        const numValue = numericX.getValue()
        api.set(layerId, {[attrId+".x"]: numValue})
    }

    numericY.setValue(api.get(layerId, attrId+".y"))

    numericY.onValueChanged = function() {
        const numValue = numericY.getValue()
        api.set(layerId, {[attrId+".y"]: numValue})
    }

    numericZ.setValue(api.get(layerId, attrId+".z"))

    numericZ.onValueChanged = function() {
        const numValue = numericZ.getValue()
        api.set(layerId, {[attrId+".z"]: numValue})
    }

    numericW.setValue(api.get(layerId, attrId+".w"))

    numericW.onValueChanged = function() {
        const numValue = numericZ.getValue()
        api.set(layerId, {[attrId+".w"]: numValue})
    }

    numericX.bindAttr(layerId, attrId+".x")
    numericY.bindAttr(layerId, attrId+".y")
    numericZ.bindAttr(layerId, attrId+".z")
    numericW.bindAttr(layerId, attrId+".w")
}

function buildNumericControl(vLayout, layerId, attrId, isDouble, def) {
    if (def === undefined) {
        console.debug("Definition is undefined: "+attrId);
        return;
    }
    const prefix = getControlTitleWidget(layerId, attrId)
    const numeric = buildNumericWithPrefix(isDouble, def)

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(numeric)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    numeric.setValue(api.get(layerId, attrId))

    numeric.onValueChanged = function() {
        const numValue = numeric.getValue()
        api.set(layerId, {[attrId]: numValue})
    }

    // If the attribute changes, the numeric will update if necessary
    numeric.bindAttr(layerId, attrId)
}

function buildBoolControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)

    const checkbox = new ui.Checkbox(false)

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(checkbox)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    checkbox.setValue(api.get(layerId, attrId))

    checkbox.onValueChanged = function() {
        const numValue = checkbox.getValue()
        api.set(layerId, {[attrId]: numValue})
    }

    checkbox.bindAttr(layerId, attrId)
}

function buildSliderControl(vLayout, layerId, attrId, min, max) {
    const prefix = getControlTitleWidget(layerId, attrId)

    const numeric = new ui.NumericField(0)
    numeric.setFontSize(dFontSize)
    numeric.setFixedHeight(18)
    numeric.setFixedWidth(dFieldWidth)
    numeric.setMin(min)
    numeric.setMax(max)

    var slider = new ui.Slider()
    slider.setRange(min,max)

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(slider)
    layout.add(numeric)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    slider.setValue(api.get(layerId, attrId))
    numeric.setValue(api.get(layerId, attrId))

    slider.onValueChanged = function() {
        slider.interacting = true
        var numValue = slider.getValue()
        api.set(layerId, {[attrId]: numValue})
        if (!numeric.interacting) {
            numeric.setValue(numValue)
        }
        slider.interacting = false
    }

    numeric.onValueChanged = function() {
        numeric.interacting = true
        const numValue = numeric.getValue()
        api.set(layerId, {[attrId]: numValue})
        if (!slider.interacting) {
            slider.setValue(numValue)
        }
        numeric.interacting = false
    }

    numeric.bindAttr(layerId, attrId)
    slider.bindAttr(layerId, attrId)
}

function buildColorControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)

    const colorChip = new ui.ColorChip()
    // DO NOT USE setFixedWidth with ColorChip, as this doesn't resize the clickable area
    colorChip.setSize(dFieldWidth, 22)

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(colorChip)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    const argb = api.get(layerId, attrId)
    colorChip.setColor(cavalry.rgbToHex(argb.r, argb.g, argb.b, false))

    colorChip.onValueChanged = function() {
        const value = colorChip.getColor()
        api.set(layerId, {[attrId]: value})
    }
    colorChip.bindAttr(layerId, attrId)
}

function buildEnumControl(vLayout, layerId, attrId, enumValues) {
    const prefix = getControlTitleWidget(layerId, attrId)

    let dropDown = new ui.DropDown()
    for (const index of enumValues) {
        dropDown.addEntry(api.getDropdownNiceName(layerId, attrId, index))
    }

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(dropDown)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    dropDown.setValue(api.get(layerId, attrId))

    dropDown.onValueChanged = function() {
        const value = dropDown.getValue()
        api.set(layerId, {[attrId]: value})
    }

    dropDown.bindAttr(layerId, attrId)
}

function buildFontControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)

    var familyDropDown = new ui.DropDown();
    var stylesDropDown = new ui.DropDown();

    familyDropDown.populateFontFamilies();

    const layout = new ui.HLayout()
    layout.add(prefix)
    layout.add(familyDropDown)
    layout.add(stylesDropDown)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    vLayout.add(container)

    const typeface = api.get(layerId, attrId)
    familyDropDown.setText(typeface.font)
    stylesDropDown.populateStylesForFamily(typeface.font);

    familyDropDown.onValueChanged = function() {
        const value = familyDropDown.getText()
        api.set(layerId, {[attrId+".font"]: value})
        stylesDropDown.populateStylesForFamily(value);
    }

    stylesDropDown.onValueChanged = function() {
        const value = stylesDropDown.getText()
        api.set(layerId, {[attrId+".style"]: value})
    }

    familyDropDown.bindAttr(layerId, attrId+".font")
    stylesDropDown.bindAttr(layerId, attrId+".style")
}

function buildAssetControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)
    const headerLayout = new ui.HLayout()
    headerLayout.setMargins(0,0,0,0)

    const icon = `${api.getAppAssetsPath()}/icons/reload.png`
    var reloadButton = new ui.ImageButton(icon)
    reloadButton.setImageSize(18,18)
    reloadButton.setSize(20,20)
    reloadButton.onClick = function () {
        const aId = api.get(layerId, attrId)
        api.reloadAsset(aId.assetId)
    };

    headerLayout.add(prefix)
    headerLayout.addStretch()
    headerLayout.add(reloadButton)

    let filePath = new ui.FilePath()
    filePath.setMode("OpenFile");
    filePath.setFontSize(dFontSize)
    filePath.setReadOnly(true);
    
    const layout = new ui.VLayout()
    layout.add(headerLayout)
    layout.add(filePath)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    container.setFixedHeight(58)
    vLayout.add(container)

    let aId = api.get(layerId, attrId)
    if (api.isFileAsset(aId.assetId)) {
        const fp = api.getAssetFilePath(aId.assetId)
        filePath.setFilePath(fp)

        filePath.onValueCommitted = function() {
            const aId = api.get(layerId, attrId)
            const value = filePath.getFilePath()
            api.replaceAsset(aId.assetId, value)
        }
    } else if (api.getAssetType(aId.assetId) === "spreadsheet") {
        filePath.hideLoadButton()
        const url = api.getGoogleSheetAssetURL(aId.assetId)
        filePath.setFilePath(url)

        filePath.onValueCommitted = function() {
            const aId = api.get(layerId, attrId)
            const value = filePath.getFilePath()
            api.replaceGoogleSheet(aId.assetId, value)
        }
    }

    // File path widgets can be bound to Asset attributes
    filePath.bindAttr(layerId, attrId)
}

function buildTextControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)

    var lineEdit = ui.MultiLineEdit();
    lineEdit.setPlaceholder("Enter some text...");
    lineEdit.setBackgroundColor(ui.getThemeColor("Window"));
    lineEdit.setFixedHeight(70);
    lineEdit.setFontSize(dFontSize)

    const titleLayout = new ui.HLayout()
    titleLayout.add(prefix)
    titleLayout.addStretch()
    titleLayout.setMargins(0, 0, 0, 0)

    const layout = new ui.VLayout()
    layout.add(titleLayout)
    layout.add(lineEdit)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    container.setFixedHeight(106)
    vLayout.add(container)

    const richTextObject = api.get(layerId, attrId)
    lineEdit.setText(richTextObject.text)

    lineEdit.onValueChanged = function() {
        const value = lineEdit.getText()
        api.set(layerId, {[attrId]: value})
    }

    lineEdit.bindAttr(layerId, attrId)
}

function buildSingleLineTextControl(vLayout, layerId, attrId) {
    const prefix = getControlTitleWidget(layerId, attrId)

    var lineEdit = ui.LineEdit();
    lineEdit.setPlaceholder("Enter some text...");
    lineEdit.setBackgroundColor(ui.getThemeColor("Window"));
    lineEdit.setFixedHeight(24);
    lineEdit.setFontSize(dFontSize)

    const titleLayout = new ui.HLayout()
    titleLayout.add(prefix)
    titleLayout.addStretch()
    titleLayout.setMargins(0, 0, 0, 0)

    const layout = new ui.VLayout()
    layout.add(titleLayout)
    layout.add(lineEdit)
    layout.setMargins(dMargins, dMargins, dMargins, dMargins)

    const container = buildContainer(layout)
    container.setFixedHeight(58)
    vLayout.add(container)

    const text = api.get(layerId, attrId)
    lineEdit.setText(text)

    lineEdit.onValueChanged = function() {
        const value = lineEdit.getText()
        api.set(layerId, {[attrId]: value})
    }

    lineEdit.bindAttr(layerId, attrId)
}

function prefsPath() {
    const prefs = api.getPreferencesPath()
    return prefs + "/ccPrefs.json";
}

function getPrefs() {
    const controlPrefs = prefsPath()
    let prefs = '{ "recentFiles": [] }'

    if (api.filePathExists(controlPrefs)) {
        prefs = api.readFromFile(controlPrefs)
    }

    let json = JSON.parse(prefs)
    return json
}

function savePrefs(prefs) {
    const controlPrefs = prefsPath()
    api.writeToFile(controlPrefs, JSON.stringify(prefs), true)
}

function saveNewRecent(scenePath) {
    let prefs = getPrefs()
    if (!prefs.recentFiles.includes(scenePath)) {
        prefs.recentFiles.unshift(scenePath)
    }
    if (prefs.recentFiles.length > 5) {
        prefs.recentFiles = prefs.recentFiles.slice(0, 5);
    }
    savePrefs(prefs)
}

const mainLayout = new ui.VLayout()

function buildControls() {
    const ccAttrs = api.getControlCentreAttributes(api.getActiveComp())
    // If there are no attributes, allow the UI to be fully custom (using the header script) so return here.
    if (ccAttrs.length === 0) {
        return;
    }
    const vLayout = new ui.VLayout()

    for (const path of ccAttrs) {
        const [layerId, attrId] = path.split(/\.(.+)/)
        const definition = api.getAttributeDefinition(layerId, attrId);
        if (definition) {
            if (definition.type === "double") {
                if (definition.numericInfo.isBound) {
                    buildSliderControl(vLayout, layerId, attrId, definition.numericInfo.hardMin, definition.numericInfo.hardMax)
                } else {
                    buildNumericControl(vLayout, layerId, attrId, true, definition);
                }
            } else if (definition.type === "int") {
                if (attrId === "dynamicIndexOffset") {
                    buildNumericControl(vLayout, layerId, "dynamicIndex", false, definition)
                } else {
                    buildNumericControl(vLayout, layerId, attrId, false, definition)
                }
            } else if (definition.type === "color") {
                buildColorControl(vLayout, layerId, attrId)
            } else if (definition.type === "richText" || definition.type === "string") {
                if (definition.multiline || definition.type === "richText") {
                    buildTextControl(vLayout, layerId, attrId)
                } else {
                    buildSingleLineTextControl(vLayout, layerId, attrId)
                }
            } else if (definition.type === "enum") {
                buildEnumControl(vLayout, layerId, attrId, definition.enumValues)
            }  else if (definition.type === "assetId") {
                buildAssetControl(vLayout, layerId, attrId)
            } else if (definition.type === "bool") {
                buildBoolControl(vLayout, layerId, attrId)
            } else if (definition.type === "int2" || definition.type === "double2") {
                buildNumeric2Control(vLayout, layerId, attrId, definition)
            } else if (definition.type === "int3" || definition.type === "double3") {
                if (api.isTransform(layerId) && attrId === "rotation" && !api.has3dTransforms(layerId)) {
                    const zDef = definition.children[2]
                    buildNumericControl(vLayout, layerId, "rotation.z", definition.type === "double3", zDef)
                } else if (api.isTransform(layerId) && attrId === "position" && !api.has3dTransforms(layerId)) {
                    buildNumeric2Control(vLayout, layerId, "position", definition)
                } else {
                    buildNumeric3Control(vLayout, layerId, attrId, definition)
                }
            } else if (definition.type === "int4" || definition.type === "double4") {
                buildNumeric4Control(vLayout, layerId, attrId, definition)
            }  else if (definition.type === "font") {
                buildFontControl(vLayout, layerId, attrId)
            } else {
                console.log("unknown type: "+definition.type)
            }
        }
    }

    vLayout.addStretch()

    function makeRenderButton(title, iconName) {
        const icon = `${api.getAppAssetsPath()}/icons/`+iconName
        var renderButton = new ui.Button(title)
        renderButton.setCornerRounding(dInnerCornerRounding)
        renderButton.setContentsMargins(4,0,0,0)
        renderButton.setSpacing(8)
        renderButton.setImage(icon)
        renderButton.setImageSize(20,20)
        renderButton.setSize(140, 28)
        renderButton.setFontSize(dFontSize)
        return renderButton
    }

    const buttonLayout = new ui.FlowLayout(dFlowLayoutHSpacing, dFlowLayoutVSpacing)
    buttonLayout.setMargins(0,0,0,0)

    function doesRQIrenderThisComp(rqId, thisCompId) {
        let compAttrs = api.getAttrChildren(rqId, "targets")
        for (const compAttrId of compAttrs) {
            const inputConn = api.getInConnection(rqId, compAttrId+".id")
            const [compId, attrId] = inputConn.split(/\.(.+)/)
            if (compId === thisCompId) {
                return true
            }
        }
        return false
    }

    const rqis = api.getRenderQueueItems()
    const thisCompId = api.getActiveComp()

    // If there are no RQIs for this comp, we show generic render button options
    let rqiFoundForComp = false
    for (rqId of rqis) {
        if (doesRQIrenderThisComp(rqId, thisCompId)) {
            rqiFoundForComp = true
            break
        }
    }

    if (rqiFoundForComp) {
        // Make a render button for every RQI (unless...)
        for (const rqId of rqis) {
            // Unless it doesn't render this paricular comp
            if (!doesRQIrenderThisComp(rqId, thisCompId)) {
                continue;
            }
            const renderType = api.getCurrentGeneratorType(rqId, "generator")
            const movieTypes = ["renderQuicktime", "renderMP4", "renderAPNG", "renderWebM", "renderLottie", "renderHVEC"];
            const icon = movieTypes.includes(renderType) ? "assets/video.png" : "image.png"
            var renderButton = makeRenderButton(api.getNiceName(rqId), icon)
            renderButton.onClick = function () {
                api.stop()
                api.render(rqId)
            };
            buttonLayout.add(renderButton)
        }
    } else {
        // Show default export options
        var renderStillButton = makeRenderButton("Render Still", "image.png")
        renderStillButton.onClick = function () {
            api.stop()
            const filePath = ui.chooseFileToSave(api.getRenderPath(), "PNG (*.png)")
            if (!filePath) {
                return;
            }
            api.renderPNGFrame(filePath, 100)
        };

        var renderMP4Button = makeRenderButton("Render MP4", "assets/video.png")
        renderMP4Button.onClick = function () {
            api.stop()
            const filePath = ui.chooseFileToSave(api.getRenderPath(), "MP4 (*.mp4)")
            if (!filePath) {
                return;
            }
            var itemId = api.addRenderQueueItem(api.getActiveComp())
            api.setGenerator(itemId, "generator", "renderMP4")
            const fileName = api.getFileNameFromPath(filePath, false)
            const folderPath = api.getFolderFromPath(filePath)
            api.set(itemId, {"fileName": fileName, "filePath": folderPath})
            api.render(itemId)
        };

        var renderProResButton = makeRenderButton("Render ProRes", "assets/video.png")
        renderProResButton.onClick = function () {
            api.stop()
            const filePath = ui.chooseFileToSave(api.getRenderPath(), "QuickTime Movie (*.mov)")
            if (!filePath) {
                return;
            }
            var itemId = api.addRenderQueueItem(api.getActiveComp())
            api.setGenerator(itemId, "generator", "renderQuicktime")
            const fileName = api.getFileNameFromPath(filePath, false)
            const folderPath = api.getFolderFromPath(filePath)
            api.set(itemId, {"fileName": fileName, "filePath": folderPath})
            api.render(itemId)
        };

        buttonLayout.add(renderStillButton)
        buttonLayout.add(renderMP4Button)
        buttonLayout.add(renderProResButton)
    }

    const container = new ui.Container()
    container.setLayout(buttonLayout)
    // The width of this window is fixed, so we can set a fixed height for the flowlayout to keep it
    // trim (with no whitespace at the bottom).
    const minHeight = buttonLayout.getHeightForWidth(475)
    container.setFixedHeight(minHeight)

    vLayout.addStretch()
    vLayout.addSeparator("Export")
    vLayout.add(container)

    mainLayout.add(vLayout)
}

function buildWelcome() {
    // show welcome
    const welcomeLabel = new ui.Label("Welcome")
    welcomeLabel.setAlignment(1) // centre
    welcomeLabel.setFontSize(36)

    const instructionsLabel = new ui.Label("To get started, click the 'Open...' button and choose a Scene.")
    instructionsLabel.setAlignment(1) // centre
    instructionsLabel.setFontSize(dFontSize)

    const vLayout = new ui.VLayout()
    vLayout.addStretch()
    vLayout.setMargins(20,20,20,20)
    vLayout.setSpaceBetween(10)

    const loadIcon = `${api.getAppAssetsPath()}/icons/transform.png`;
    var loadButton = new ui.Button("Open...")
    loadButton.setImage(loadIcon)
    loadButton.setFixedHeight(38)
    loadButton.setImageSize(18,18)
    loadButton.setSpacing(8)
    loadButton.setFontSize(dFontSize)
    loadButton.setCornerRounding(dInnerCornerRounding)
    loadButton.onClick = function () {
        ui.openSceneDialog()
    }

    vLayout.add(welcomeLabel)
    vLayout.add(instructionsLabel)
    vLayout.addSeparator("")
    vLayout.add(loadButton)

    const prefs = getPrefs();
    if (prefs.recentFiles.length) {
        vLayout.addSeparator("")

        for (const recent of prefs.recentFiles) {
            var recentButton = new ui.Button(api.getFileNameFromPath(recent, false))
            recentButton.setImage(loadIcon)
            recentButton.setFixedHeight(38)
            recentButton.setImageSize(18,18)
            recentButton.setSpacing(8)
            recentButton.setFontSize(dFontSize)
            recentButton.setCornerRounding(dInnerCornerRounding)
            recentButton.onClick = function () {
                api.openScene(recent, true)
            }
            vLayout.add(recentButton)
        }
    }

    vLayout.addStretch()
    vLayout.addStretch()

    mainLayout.add(vLayout)
}

function showControlsOrWelcome() {
    const scenePath = api.getSceneFilePath()
    if (scenePath) {
        ui.setCallbacksActive(false)
        buildControls()
        ui.setCallbacksActive(true)
        saveNewRecent(scenePath)
    } else {
        buildWelcome()
    }
}

function sceneHasChanged() {
    mainLayout.clear()
    showControlsOrWelcome()
}

function Callbacks() { 
    // This callback will be called whenever a new composition is loaded
    this.onCompChanged = function () {
        sceneHasChanged()
    }

    // This callback will be called whenever the Scene is changed (e.g Load Scene or New Scene).
    this.onSceneChanged = function () {
        sceneHasChanged()
    }
}

// Create the callback object
var callbackObj = new Callbacks()

// Add a callback object (you can have several if you're that way inclined)
ui.addCallbackObject(callbackObj)

showControlsOrWelcome()

ui.setBackgroundColor(ui.getThemeColor("Base"))
ui.setMargins(6, 6, 6, 6)
ui.add(mainLayout)
ui.show()