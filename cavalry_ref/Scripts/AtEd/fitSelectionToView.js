// Copyright 2025 Scene Group Ltd.

// Set the window title
ui.setTitle("Fit to View");

// Create a numeric field for margin input
var marginField = new ui.NumericField(100);
marginField.setSize(ui.fieldWidth, ui.fieldHeight);

// Create a button
var buttonFitToCamera = new ui.Button("Fit to View");

// Set a callback function, this will be run when the button is clicked
buttonFitToCamera.onClick = function () {
    let margin = marginField.getValue(); // Get the margin value from the field
    let selectedLayers = api.getSelection();
    if (selectedLayers.length === 1) { // Ensure one layer is selected
        let layerId = selectedLayers[0];
        let bbox = api.getBoundingBox(layerId, true); // Get world space bounding box

        var layerPosition = api.get(layerId, 'position'); // Get the selected layer's position
        var layerRotationZ = api.get(layerId, 'rotation.z'); // Get the selected layer's z rotation

        let res = api.get(api.getActiveComp(), "resolution"); // Get composition resolution
        let cameraLayerId = api.getActiveCamera();
        
        // Assuming a default Cavalry camera zoom of 879.130
        let cameraZoom = api.get(cameraLayerId, "zoom");
        
        // Calculate the new camera positions taking into account the layer's position.z and the margin
        calculateCameraPositionToFit(bbox, layerPosition, layerRotationZ, res, cameraZoom, margin);
        
        console.log("The Active camera has been positioned to fit the selected layer.");
    } else {
        console.log("Please select a single layer.");
    }
}

// Function to calculate the camera position to fit the selected layer with a margin
function calculateCameraPositionToFit(bbox, layerPosition, layerRotation, res, cameraZoom, margin) {
    let cameraLayerId = api.getActiveCamera();

    // Adjust the composition resolution to account for the margin
    let adjustedRes = {
        x: res.x - margin * 2,
        y: res.y - margin * 2
    };

    // Calculate aspect ratios
    let compAspect = adjustedRes.x / adjustedRes.y;
    let bboxAspect = bbox.width / bbox.height;

    // Determine which dimension is more limiting based on aspect ratios
    let scale;
    if (compAspect > bboxAspect) {
        // Bounding box is limited by height
        scale = adjustedRes.y / bbox.height;
    } else {
        // Bounding box is limited by width
        scale = adjustedRes.x / bbox.width;
    }

    // Calculate camera Z position based on the limiting dimension
    let zPosition = cameraZoom / scale;

    // Set the camera attributes
    api.set(cameraLayerId, {
        'cameraType': 0,
        'position.x': bbox.centre.x,
        'position.y': bbox.centre.y,
        'position.z': zPosition + layerPosition.z,
        'rotation.z': -layerRotation
    });
}

function makeHorizLayout(name, field){
    var horizLayout = new ui.HLayout();
    horizLayout.setMargins(0,0,0,0);
    horizLayout.setSpaceBetween(0);
    horizLayout.add(new ui.Label(name));
    horizLayout.add(field);
    return horizLayout;
};

// Create the layout and add the margin field and button
var layout = new ui.VLayout();
layout.add(makeHorizLayout("Margin", marginField));
layout.addStretch();
layout.add(buttonFitToCamera);

// Add the layout to the default layout
ui.add(layout);

function Callbacks() { 
    // This callback will be called whenever the scene selection changes
    this.onSelectionChanged = function () {
        buttonFitToCamera.setEnabled(api.getSelection().length > 0);
    }
}

var callbacks = new Callbacks();
// trigger this manually to get the button into the correct state

callbacks.onSelectionChanged();
ui.addCallbackObject(callbacks);

// Show the window
ui.show();
