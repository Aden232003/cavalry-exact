// Copyright 2025 Scene Group Ltd.

// Attribute Definition Editor
// Allows editing of numeric attribute definitions (min, max, soft min, soft max, step)

(function() {
    ui.setTitle("Attribute Definition Editor");

    // Get the definition
    var def = api.getEffectiveAttributeDefinition(atEd.layerId, atEd.attrId);
    if (!def) {
        var modal = new ui.Modal();
        modal.showMessage("Could not get attribute definition.");
        return;
    }

    // Check if this attribute type supports definition overrides
    var attrType = def.type;
    var supportedTypes = ["int", "double", "double2", "int2", "double3", "int3", "double4", "int4"];
    if (supportedTypes.indexOf(attrType) === -1) {
        var modal = new ui.Modal();
        modal.showMessage("Attribute type '" + attrType + "' does not support definition editing.\n\nSupported types: " + supportedTypes.join(", "));
        return;
    }

    // Helper functions for complex types
    const getDim = (type) => {
        const m = /\d+$/.exec(type);
        return m ? Math.min(+m[0], 4) : 1;
    };

    const hasOverrideForProperty = (layerId, attrId, property) => {
        const type = api.getAttrType(layerId, attrId);
        const dim = getDim(type);

        if (dim === 1) {
            return api.getAttributeDefinitionOverride(layerId, attrId, property) !== null;
        } else {
            const comps = ["x", "y", "z", "w"];
            for (let i = 0; i < dim; i++) {
                const componentAttr = `${attrId}.${comps[i]}`;
                if (api.getAttributeDefinitionOverride(layerId, componentAttr, property) !== null) {
                    return true;
                }
            }
            return false;
        }
    };

    const getOverrideValueForProperty = (layerId, attrId, property) => {
        const type = api.getAttrType(layerId, attrId);
        const dim = getDim(type);

        if (dim === 1) {
            return api.getAttributeDefinitionOverride(layerId, attrId, property);
        } else {
            const comps = ["x", "y", "z", "w"];
            for (let i = 0; i < dim; i++) {
                const componentAttr = `${attrId}.${comps[i]}`;
                const override = api.getAttributeDefinitionOverride(layerId, componentAttr, property);
                if (override !== null) {
                    return override;
                }
            }
            return null;
        }
    };

    // Store whether we have existing overrides
    var hasOverrides = api.hasAttributeDefinitionOverrides(atEd.layerId, atEd.attrId);

    // Get original definition values
    var origHardMin = def.numericInfo.hardMin !== undefined ? def.numericInfo.hardMin : null;
    var origHardMax = def.numericInfo.hardMax !== undefined ? def.numericInfo.hardMax : null;
    var origSoftMin = def.numericInfo.softMin !== undefined ? def.numericInfo.softMin : null;
    var origSoftMax = def.numericInfo.softMax !== undefined ? def.numericInfo.softMax : null;
    var origStep = def.numericInfo.step !== undefined ? def.numericInfo.step : null;

    // UI State - check for existing overrides using helper functions
    var enableHardMin = hasOverrideForProperty(atEd.layerId, atEd.attrId, "hardMin");
    var enableHardMax = hasOverrideForProperty(atEd.layerId, atEd.attrId, "hardMax");
    var enableSoftMin = hasOverrideForProperty(atEd.layerId, atEd.attrId, "softMin");
    var enableSoftMax = hasOverrideForProperty(atEd.layerId, atEd.attrId, "softMax");
    var enableStep = hasOverrideForProperty(atEd.layerId, atEd.attrId, "step");

    var attrLabel = new ui.Label("**Attribute:** " + api.getAttributeNiceName(atEd.layerId, atEd.attrId));
    attrLabel.setAlignment(1);

    // Determine if this is an integer type
    var isIntType = attrType.indexOf("int") === 0;

    // Hard Min
    var hardMinCheckbox = new ui.Checkbox(enableHardMin);
    var hardMinLabel = new ui.Label("Hard Min");
    var hardMinValue = enableHardMin ?
        getOverrideValueForProperty(atEd.layerId, atEd.attrId, "hardMin") :
        (origHardMin !== null ? origHardMin : 0);
    var hardMinField = new ui.NumericField(0);
    hardMinField.setType(isIntType ? 0 : 1);
    hardMinField.setValue(hardMinValue);
    hardMinField.setEnabled(enableHardMin);
    hardMinField.setFixedWidth(ui.fieldWidth);

    var hardMinLayout = new ui.HLayout();
    hardMinLayout.setSpaceBetween(5);
    hardMinLayout.add(hardMinCheckbox);
    hardMinLayout.add(hardMinLabel);
    hardMinLayout.addStretch();
    hardMinLayout.add(hardMinField);

    // Hard Max
    var hardMaxCheckbox = new ui.Checkbox(enableHardMax);
    var hardMaxLabel = new ui.Label("Hard Max");
    var hardMaxValue = enableHardMax ?
        getOverrideValueForProperty(atEd.layerId, atEd.attrId, "hardMax") :
        (origHardMax !== null ? origHardMax : 100);
    var hardMaxField = new ui.NumericField(0);
    hardMaxField.setType(isIntType ? 0 : 1);
    hardMaxField.setValue(hardMaxValue);
    hardMaxField.setEnabled(enableHardMax);
    hardMaxField.setFixedWidth(ui.fieldWidth);

    var hardMaxLayout = new ui.HLayout();
    hardMaxLayout.setSpaceBetween(5);
    hardMaxLayout.add(hardMaxCheckbox);
    hardMaxLayout.add(hardMaxLabel);
    hardMaxLayout.addStretch();
    hardMaxLayout.add(hardMaxField);

    // Soft Min
    var softMinCheckbox = new ui.Checkbox(enableSoftMin);
    var softMinLabel = new ui.Label("Soft Min");
    var softMinValue = enableSoftMin ?
        getOverrideValueForProperty(atEd.layerId, atEd.attrId, "softMin") :
        (origSoftMin !== null ? origSoftMin : 0);
    var softMinField = new ui.NumericField(0);
    softMinField.setType(isIntType ? 0 : 1);
    softMinField.setValue(softMinValue);
    softMinField.setEnabled(enableSoftMin);
    softMinField.setFixedWidth(ui.fieldWidth);

    var softMinLayout = new ui.HLayout();
    softMinLayout.setSpaceBetween(5);
    softMinLayout.add(softMinCheckbox);
    softMinLayout.add(softMinLabel);
    softMinLayout.addStretch();
    softMinLayout.add(softMinField);

    // Soft Max
    var softMaxCheckbox = new ui.Checkbox(enableSoftMax);
    var softMaxLabel = new ui.Label("Soft Max");
    var softMaxValue = enableSoftMax ?
        getOverrideValueForProperty(atEd.layerId, atEd.attrId, "softMax") :
        (origSoftMax !== null ? origSoftMax : 100);
    var softMaxField = new ui.NumericField(0);
    softMaxField.setType(isIntType ? 0 : 1);
    softMaxField.setValue(softMaxValue);
    softMaxField.setEnabled(enableSoftMax);
    softMaxField.setFixedWidth(ui.fieldWidth);

    var softMaxLayout = new ui.HLayout();
    softMaxLayout.setSpaceBetween(5);
    softMaxLayout.add(softMaxCheckbox);
    softMaxLayout.add(softMaxLabel);
    softMaxLayout.addStretch();
    softMaxLayout.add(softMaxField);

    // Step
    var stepCheckbox = new ui.Checkbox(enableStep);
    var stepLabel = new ui.Label("Step");
    var stepValue = enableStep ?
        getOverrideValueForProperty(atEd.layerId, atEd.attrId, "step") :
        (origStep !== null ? origStep : 1);
    var stepField = new ui.NumericField(0);
    stepField.setType(isIntType ? 0 : 1);
    stepField.setValue(stepValue);
    stepField.setEnabled(enableStep);
    stepField.setFixedWidth(ui.fieldWidth);

    var stepLayout = new ui.HLayout();
    stepLayout.setSpaceBetween(5);
    stepLayout.add(stepCheckbox);
    stepLayout.add(stepLabel);
    stepLayout.addStretch();
    stepLayout.add(stepField);

    // Checkbox callbacks
    const forEachTargetAttr = (layerId, attrId, dim, fn) => {
        if (dim === 1) {
            fn(attrId);
        } else {
            const comps = ["x", "y", "z", "w"];
            for (let i = 0; i < dim; i++) fn(`${attrId}.${comps[i]}`);
        }
    };

    const setOverrideAcrossDims = (layerId, attrId, prop, value) => {
        const type = api.getAttrType(layerId, attrId);
        const dim = getDim(type);
        forEachTargetAttr(layerId, attrId, dim, (aid) => {
            api.setAttributeDefinitionOverride(layerId, aid, prop, value);
        });
    };

    // Generic binder for a checkbox+field pair
    const bindOverride = (checkbox, field, prop) => {
        const sync = () => {
            const enabled = checkbox.getValue();
            field.setEnabled(enabled);
            setOverrideAcrossDims(atEd.layerId, atEd.attrId, prop, enabled ? field.getValue() : null);
        };
        checkbox.onValueChanged = sync;
        field.onValueChanged = () => {
            if (checkbox.getValue()) {
                setOverrideAcrossDims(atEd.layerId, atEd.attrId, prop, field.getValue());
            }
        };
        sync();
    };

    // Wire everything up
    bindOverride(hardMinCheckbox, hardMinField, "hardMin");
    bindOverride(hardMaxCheckbox, hardMaxField, "hardMax");
    bindOverride(softMinCheckbox, softMinField, "softMin");
    bindOverride(softMaxCheckbox, softMaxField, "softMax");
    bindOverride(stepCheckbox, stepField, "step");

    // Reset button
    var resetButton = new ui.Button("Clear All Changes");
    resetButton.onClick = function() {
        const type = api.getAttrType(atEd.layerId, atEd.attrId);
        const typeDims = {
            int: 1, double: 1,
            int2: 2, double2: 2,
            int3: 3, double3: 3,
            int4: 4, double4: 4
        };

        const dim = typeDims[type];
        if (dim) {
            if (dim === 1) {
                api.clearAttributeDefinitionOverrides(atEd.layerId, atEd.attrId);
            } else {
                const suffixes = ["x", "y", "z", "w"];
                for (let i = 0; i < dim; i++) {
                    api.clearAttributeDefinitionOverrides(
                        atEd.layerId,
                        `${atEd.attrId}.${suffixes[i]}`
                    );
                }
            }
        }

        // Reset UI
        hardMinCheckbox.setValue(false);
        hardMaxCheckbox.setValue(false);
        softMinCheckbox.setValue(false);
        softMaxCheckbox.setValue(false);
        stepCheckbox.setValue(false);

        hardMinField.setEnabled(false);
        hardMaxField.setEnabled(false);
        softMinField.setEnabled(false);
        softMaxField.setEnabled(false);
        stepField.setEnabled(false);

        // Reset to original values
        if (origHardMin !== null) hardMinField.setValue(origHardMin);
        if (origHardMax !== null) hardMaxField.setValue(origHardMax);
        if (origSoftMin !== null) softMinField.setValue(origSoftMin);
        if (origSoftMax !== null) softMaxField.setValue(origSoftMax);
        if (origStep !== null) stepField.setValue(origStep);
    };

    // Info label
    var infoLabel = new ui.Label("Changes are constrained by internal limits and saved with the Scene.");
    infoLabel.setAlignment(1);

    // Build the layout
    ui.setSpaceBetween(5);
    ui.add(attrLabel);
    ui.addSpacing(6);

    var mainLayout = new ui.VLayout();
    mainLayout.add(hardMinLayout);
    mainLayout.add(hardMaxLayout);
    mainLayout.add(softMinLayout);
    mainLayout.add(softMaxLayout);
    mainLayout.add(stepLayout);

    ui.add(mainLayout);
    ui.addSpacing(6);
    ui.add(resetButton);
    ui.addSpacing(6);
    ui.add(infoLabel);
    ui.addStretch();

    ui.setMinimumWidth(300);
    ui.setMinimumHeight(280);
    ui.show();
})();