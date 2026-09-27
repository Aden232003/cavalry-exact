// Copyright 2025 Scene Group Ltd.

// SkSL to Plugin Exporter
// This script automates the conversion of SkSL filters and shaders to Cavalry plugins

// Global variables to store the layer and UI elements
var authorInput;
var pluginNameInput;
var exportButton;
var encryptCheckbox;
var feedbackLabel;

function initialiseUI() {
    // Set window title
    ui.setTitle("Export SkSL to Plugin");
    ui.setMinimumWidth(400);
    ui.setMinimumHeight(135);
    
    // Author input
    var authorLabel = new ui.Label("Author");
    authorInput = new ui.LineEdit();
    authorInput.setPlaceholder("Your name or company (spaces will be removed)");

    // Name input
    var nameLabel = new ui.Label("Plugin Name");
    pluginNameInput = new ui.LineEdit();
    pluginNameInput.setPlaceholder("The name of your plugin.");
    pluginNameInput.setText(api.getNiceName(atEd.layerId));

    // Load saved author preference if it exists
    if (api.hasPreferenceObject("cavalry.exportSkSL.author")) {
        var savedPrefs = api.getPreferenceObject("cavalry.exportSkSL.author");
        if (savedPrefs && savedPrefs.author) {
            authorInput.setText(savedPrefs.author);
        }
    }
    
    authorInput.onValueChanged = function() {
        updateExportButton();
    };
    
    // When user commits the value (e.g., presses Enter or tabs away), clean it up
    authorInput.onValueCommitted = function() {
        var currentText = authorInput.getText().trim();
        if (currentText !== "") {
            // Remove whitespace and update the field
            var cleanedText = currentText.replace(/\s+/g, '');
            authorInput.setText(cleanedText);
            
            // Save the author preference
            api.setPreferenceObject("cavalry.exportSkSL.author", { author: cleanedText });
        }
        updateExportButton();
    };
    
    var authorLayout = new ui.HLayout();
    authorLayout.setSpaceBetween(3);
    authorLayout.add(authorLabel);
    authorLayout.add(authorInput);

    var nameLayout = new ui.HLayout();
    nameLayout.setSpaceBetween(3);
    nameLayout.add(nameLabel);
    nameLayout.add(pluginNameInput);

    var encryptLabel = new ui.Label("Encrypt");
    encryptCheckbox = new ui.Checkbox(false);

    var encryptLayout = new ui.HLayout()
    encryptLayout.setSpaceBetween(3);
    encryptLayout.add(encryptLabel);
    encryptLayout.add(encryptCheckbox);
    
    // Export button
    exportButton = new ui.Button("Export...");
    exportButton.setEnabled(false);
    exportButton.onClick = function() {
        performExport();
    };
    exportButton.setMinimumWidth(125);
    
    // Create feedback label
    feedbackLabel = new ui.Label("");
    feedbackLabel.setTextColor("#4ffd7a"); // Green color
    feedbackLabel.setAlignment(0); // Left align

    var feedbackLayout = new ui.HLayout();
    feedbackLayout.add(feedbackLabel);

    var buttonLayout = new ui.HLayout();
    buttonLayout.addStretch();
    buttonLayout.add(exportButton);
    
    // Add all elements to the main layout
    ui.add(authorLayout);
    ui.add(nameLayout);
    ui.add(encryptLayout);
    ui.add(feedbackLayout);
    ui.add(buttonLayout);
    ui.addStretch();
    ui.setSpaceBetween(0);

    updateExportButton();

    // Show the window
    ui.show();
}

function updateExportButton() {
    var hasAuthor = authorInput.getText().trim() !== "";
    var hasName = pluginNameInput.getText().trim() !== "";
    exportButton.setEnabled(hasAuthor && hasName);
}

function performExport() {
    // Hide feedback initially
    feedbackLabel.setHidden(true);
    
    var layerType = api.getLayerType(atEd.layerId);
    var currentLayer = {
        id: atEd.layerId,
        type: layerType,
        name: pluginNameInput.getText().trim()
    };

    var author = authorInput.getText().trim();

    const exportPath = api.presentChooseFolder(api.getDesktopFolder(), "Export as Plugin");

    if (!author || !currentLayer) {
        console.log("Cannot export - missing required information");
        return;
    }

    /// User canceled export
    if (exportPath === "") {
        return;
    }
    
    // Remove any whitespace from the author string (should already be clean, but I'm paranoid)
    author = author.replace(/\s+/g, '');

    try {
        exportLayer(currentLayer, author, exportPath);
        console.info("✓ Successfully exported " + currentLayer.name);
        
        // Show success feedback
        feedbackLabel.setText("Export Completed");
        feedbackLabel.setHidden(false);
    } catch (error) {
        console.error("✗ Failed to export " + currentLayer.name + ": " + error);
        
        // Show error feedback
        feedbackLabel.setText("Export Failed: " + error);
        feedbackLabel.setTextColor("#ff4444"); // Red color for errors
        feedbackLabel.setHidden(false);
    }
}

function exportLayer(layer, author, exportPath) {
    // Get SkSL code
    var skslCode = api.get(layer.id, "code");
    if (!skslCode || skslCode.trim() === "") {
        throw "No SkSL code found in layer";
    }
    
    // Get inputs array
    var inputsChildren = api.getAttrChildren(layer.id, "inputs");
    var uniforms = [];
    
    // Process each input to get uniform information
    for (var i = 0; i < inputsChildren.length; i++) {
        var inputId = inputsChildren[i];
        var uniformName = api.getCustomAttributeName(layer.id, inputId);
        var uniformType = api.getAttrType(layer.id, inputId);
        var uniformValue = api.get(layer.id, inputId);
        
        // Skip if we can't get the uniform name
        if (!uniformName || uniformName === inputId) {
            // Fallback to using the input ID as the name
            uniformName = inputId.split('.').pop();
        }
        
        uniforms.push({
            name: uniformName,
            type: uniformType,
            value: uniformValue,
            id: inputId
        });
    }
    
    // Create layer-specific folder
    var layerPath = exportPath + "/" + layer.name;

    if (!api.filePathExists(layerPath)) {
        api.makeFolder(layerPath); 
    } else {
        if (api.filePathExists(layerPath) && layerPath !== "") {
            var modal = new ui.Modal();
            var confirm = modal.showQuestion("Overwrite folder?", "A folder with the same name already exists in this location. Export as Plugin will overwrite its contents.<br><br>Would you like to continue?");
            if (!confirm) {
                throw "Folder already exists";
            }
        }
    }
    
    // Generate plugin type name (camelCase)
    var pluginTypeName = generatePluginTypeName(layer.name);
    
    // Generate the complete SkSL code with uniforms at the top
    var completeSkslCode = generateSkslWithUniforms(skslCode, uniforms, layer.type);
    
    // Generate and write SkSL file
    if (encryptCheckbox.getValue()) {
        var skslFileName = pluginTypeName + ".skslc";
        var skslFilePath = layerPath + "/" + skslFileName;
        if (!api.writeToFile(skslFilePath, api.encrypt(completeSkslCode), true)) {
            throw "Failed to write SkSL file";
        }
    } else {
        var skslFileName = pluginTypeName + ".sksl";
        var skslFilePath = layerPath + "/" + skslFileName;
        if (!api.writeToFile(skslFilePath, completeSkslCode, true)) {
            throw "Failed to write SkSL file";
        }
    }
    
    // Generate definitions.json
    var definitions = generateDefinitions(layer, pluginTypeName, skslFileName, uniforms, author);
    var definitionsPath = layerPath + "/definitions.json";
    
    if (!api.writeToFile(definitionsPath, JSON.stringify(definitions, null, 4), true)) {
        throw "Failed to write definitions file";
    }
    
    // Generate strings.json
    var strings = generateStrings(layer, pluginTypeName, uniforms, author);
    var stringsPath = layerPath + "/strings.json";
    
    if (!api.writeToFile(stringsPath, JSON.stringify(strings, null, 4), true)) {
        throw "Failed to write strings file";
    }
}

function generatePluginTypeName(layerName) {
    // Convert to camelCase and remove spaces/special characters
    var name = layerName.replace(/[^a-zA-Z0-9\s]/g, '');
    var words = name.split(/\s+/);
    var result = words[0].toLowerCase();
    
    for (var i = 1; i < words.length; i++) {
        if (words[i].length > 0) {
            result += words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
        }
    }
    
    return result || "customPlugin";
}

function generateSkslWithUniforms(originalCode, uniforms, layerType) {
    var uniformDeclarations = [];

    // Add uniform declarations for each input
    for (var i = 0; i < uniforms.length; i++) {
        var uniform = uniforms[i];
        var skslType = mapToSkslType(uniform.type);
        uniformDeclarations.push("uniform " + skslType + " " + uniform.name + ";");
    }
    
    // Check if the original code already has these uniforms to avoid duplication
    var codeLines = originalCode.split('\n');
    var existingShaderUniforms = [];  // Keep track of shader uniforms (layer etc.)
    var existingParamUniforms = [];   // Keep track of parameter uniforms
    var mainStartIndex = 0;
    
    for (var j = 0; j < codeLines.length; j++) {
        var line = codeLines[j].trim();
        if (line.startsWith("uniform ")) {
            // Check if this is a shader uniform (layer, image, source, etc.)
            if (line.includes("shader") || line.includes("sampler")) {
                existingShaderUniforms.push(codeLines[j]); // Preserve original indentation
            } else {
                existingParamUniforms.push(line);
            }
        }
        // Find where main function or first non-uniform line starts
        if (!line.startsWith("uniform ") && !line.startsWith("//") && line !== "") {
            mainStartIndex = j;
            break;
        }
    }
    
    // Check which uniforms are new
    var newUniforms = [];
    for (var k = 0; k < uniformDeclarations.length; k++) {
        var uniform = uniformDeclarations[k];
        var uniformName = uniform.split(" ")[2].replace(";", "");
        var isExisting = false;
        
        for (var l = 0; l < existingParamUniforms.length; l++) {
            if (existingParamUniforms[l].includes(uniformName)) {
                isExisting = true;
                break;
            }
        }
        if (!isExisting) {
            newUniforms.push(uniform);
        }
    }
    
    // Build the final code
    var finalCode = "";
    
    // First, add existing shader uniforms (like uniform shader layer)
    if (existingShaderUniforms.length > 0) {
        finalCode += existingShaderUniforms.join("\n") + "\n";
    }
    
    // Then add parameter uniforms (both existing and new)
    if (newUniforms.length > 0) {
        finalCode += newUniforms.join("\n") + "\n";
    }
    
    // Add a blank line before main code if we have any uniforms
    if (finalCode.length > 0) {
        finalCode += "\n";
    }
    
    // Finally, add the rest of the code (from where main starts)
    finalCode += codeLines.slice(mainStartIndex).join("\n");
    
    return finalCode;
}

function mapToSkslType(cavalryType) {
    // In SkSL, int, bool, short are all represented as float uniforms
    switch (cavalryType) {
        case "double":
        case "int":
        case "bool":
        case "short":
            return "float";
        case "double2":
        case "int2":
            return "float2";
        case "double3":
            return "float3";
        case "color":
            return "half4";
        default:
            return "float"; // Default fallback, will likely error.
    }
}

function generateDefinitions(layer, pluginTypeName, skslFileName, uniforms, author) {
    var superType = layer.type === "skslFilter" ? "thirdPartyFilter" : "thirdPartyShader";
    
    var attributes = {};
    var triggers = [];
    var attributeOrder = [];
    
    // Process uniforms to create attributes
    for (var i = 0; i < uniforms.length; i++) {
        var uniform = uniforms[i];
        var attrName = uniform.name;
        var pluginType = uniform.type;
        
        attributes[attrName] = {
            type: pluginType,
            default: uniform.value
        };
        
        // Add some reasonable constraints for common types
        if (pluginType === "double" || pluginType === "int") {
            if (attrName.toLowerCase().includes("size") || attrName.toLowerCase().includes("scale")) {
                attributes[attrName].min = 0;
            }
            if (pluginType === "int" && attrName.toLowerCase().includes("count")) {
                attributes[attrName].min = 1;
                attributes[attrName].max = 100;
            }
        }
        
        if (pluginType === "color") {
            attributes[attrName].min = 0;
            attributes[attrName].max = 255;
        }

        if (attrName === "time") {
            attributes[attrName].compConnect = "time"
        }
        
        triggers.push(attrName);
        attributeOrder.push(attrName);
    }
    
    var definition = {
        author: author,
        type: pluginTypeName,
        superType: superType,
        skslFile: skslFileName,
        version: "1.0",
        attributes: attributes,
        triggers: {
            out: triggers
        },
        UI: {
            attributeOrder: attributeOrder,
            icon: pluginTypeName + ".png"
        }
    };
    
    return [definition];
}

function generateStrings(layer, pluginTypeName, uniforms, author) {
    var attributes = {};
    var enums = {};
    
    // Generate attribute strings
    for (var i = 0; i < uniforms.length; i++) {
        var uniform = uniforms[i];
        var displayName = capitaliseWords(uniform.name);
        var tooltip = "Controls the " + displayName + " Attribute.";
        
        attributes[uniform.name] = [displayName, tooltip];
    }
    
    var layerInfo = "Custom " + (layer.type === "skslFilter" ? "filter" : "shader") + 
                   " exported from " + layer.name + ".";
    
    var strings = {
        type: "layerStrings",
        value: {
            author: author,
            layerType: pluginTypeName,
            niceName: capitaliseWords(layer.name),
            layerInfo: layerInfo,
            language: "en",
            attributes: attributes,
            enums: enums
        }
    };
    
    return [strings];
}

function capitaliseWords(str) {
    return str.replace(/\b\w+/g, function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

// Initialize the UI when the script runs
initialiseUI();