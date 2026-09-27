// Copyright 2025 Scene Group Ltd.

// Set the window title
ui.setTitle("Distribute and Scale Layers");

// Create numeric fields for the nearest and furthest distances from the camera
var nearestDistanceField = new ui.NumericField(100);
nearestDistanceField.setSize(ui.fieldWidth, ui.fieldHeight);
var furthestDistanceField = new ui.NumericField(2000);
furthestDistanceField.setSize(ui.fieldWidth, ui.fieldHeight);

// Create a dropdown for selection mode
var modeDropdown = new ui.DropDown();
modeDropdown.setFixedWidth(ui.fieldWidth*2 + 6);
modeDropdown.addEntry("Selection Order");
modeDropdown.addEntry("Distance from view centre");
modeDropdown.addEntry("Random");

// Create a checkbox for reversing the order
var reverseCheckbox = new ui.Checkbox(false);

// Create a button to run the script
var buttonDistributeScale = new ui.Button("Distribute and Scale Layers");

// Set a callback function, this will be run when the button is clicked
buttonDistributeScale.onClick = function () {
    let selectedLayers = api.getSelection();
    let nearestDistance = nearestDistanceField.getValue();
    let furthestDistance = furthestDistanceField.getValue();
    let mode = modeDropdown.getValue();
    let reverseOrder = reverseCheckbox.getValue();
    let cameraId = api.getActiveCamera();
    if (!cameraId) {
        cameraId = api.create("planarCamera", "Camera");
    }
    let cameraPosition = api.get(cameraId, 'position');

    if (selectedLayers.length < 2) {
        console.log("Please select at least two layers to continue.");
        return;
    }

    // Sort layers based on the selected mode
    if (mode == 1) {
        selectedLayers.sort(function(a, b) {
            var posA = api.get(a, 'position');
            var posB = api.get(b, 'position');
            var distA = cavalry.dist(posA.x, posA.y, 0, 0);
            var distB = cavalry.dist(posB.x, posB.y, 0, 0);
            return distA - distB;
        });
    } else if (mode == 2) {
        for (let i = selectedLayers.length - 1; i > 0; i--) {
            let j = Math.floor(cavalry.random(0, i, 1));
            [selectedLayers[i], selectedLayers[j]] = [selectedLayers[j], selectedLayers[i]];
        }
    }

    if (reverseOrder) {
        selectedLayers.reverse();
    }

    // Distribute and scale layers
    distributeAndScaleLayers(selectedLayers, nearestDistance, furthestDistance, cameraPosition);

    console.log("Layers have been distributed and scaled according to the specified mode and distances from the camera.");
}

function distributeAndScaleLayers(selectedLayers, nearestDistance, furthestDistance, cameraPosition) {
    let zIncrement = (furthestDistance - nearestDistance) / (selectedLayers.length - 1);
    selectedLayers.forEach(function(layerId, index) {
        // Calculate new Z position based on index, relative to the camera's starting Z position
        let newZ = nearestDistance - index * zIncrement;
        
        // Since we're moving layers away from the camera, their scale will naturally decrease
        // because of perspective. To maintain visual consistency, we need to scale them
        // proportionally to their distance from the camera's initial position.
        let distanceFromCamera = cameraPosition.z - newZ;
        let baseDistance = cameraPosition.z; // Reference distance for scaling; can be adjusted as needed
        let scaleFactor = 1 + (newZ / -baseDistance);

        // Adjust position x and y to compensate for the new depth
        let posX = api.get(layerId, 'position.x');
        let posY = api.get(layerId, 'position.y');

        // Space them out in Z and scale them relative to the camera's initial position
        api.set(layerId, {
            'position.x': posX * scaleFactor,
            'position.y': posY * scaleFactor,
            'position.z': newZ,
            'scale.x': scaleFactor,
            'scale.y': scaleFactor,
            "is3d": true
        });
    });
}

// Create the layout and add the widgets
var mainLayout = new ui.VLayout();


function makeHorizLayout(name, field){
	var horizLayout = new ui.HLayout();
	horizLayout.setMargins(0,0,0,0);
	horizLayout.setSpaceBetween(0);
	horizLayout.add(new ui.Label(name));
	horizLayout.add(field);
	return horizLayout;
};

mainLayout.add(makeHorizLayout("Nearest Layer Distance", nearestDistanceField))
mainLayout.add(makeHorizLayout("Furthest Layer Distance", furthestDistanceField))
mainLayout.add(makeHorizLayout("Distribution Mode", modeDropdown))
mainLayout.add(makeHorizLayout("Reverse Order", reverseCheckbox))
mainLayout.addStretch();
mainLayout.add(buttonDistributeScale);

// Add the layout to the default layout
ui.add(mainLayout);

ui.setMinimumHeight(140)
ui.setMinimumWidth(340)


function Callbacks() { 
    // This callback will be called whenever the scene selection changes
    this.onSelectionChanged = function () {
        buttonDistributeScale.setEnabled(api.getSelection().length > 0);
    }
}

var callbacks = new Callbacks();
ui.addCallbackObject(callbacks);
// trigger this manually to get the button into the correct state
callbacks.onSelectionChanged();

// Show the window
ui.show();
