// Copyright 2025 Scene Group Ltd.

// Set the window title
ui.setTitle(internal.licenceClassName() === "Apprentice" ? "Try Pro Features" : "Pro Features");
ui.setBackgroundColor("#212121");

// Check the Font Size Preference to set the Container height.
var extraHeight = 0;
var fontSize = api.getCavalryPreference("fontSize");
if (fontSize == 1) {
    extraHeight = 20;
}

// Listen for changes to the Font Size Preference to set the Container height.
function Callbacks() {
    // This callback will trigger whenever the UI Font Size preference changes.
    this.onCavalryPreferenceChanged = function () {
        fontSize = api.getCavalryPreference("fontSize");
        if (fontSize == 1) {
            extraHeight = 20;
        }
    }
}

// Create the callback object
var callbackObj = new Callbacks();

const features = [
    {
        "feature": "accumulator",
        "niceName": "Accumulator",
        "description": "Create 'stacks' of Shapes or custom layouts.",
        "type": "layer"
    },
    {
        "feature": "audioExport",
        "niceName": "Audio Export",
        "description": "Export audio to QuickTime, WebM, MP4 and AAC files.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/render-manager/#format-features"
    },
    {
        "feature": "backgroundBlurFilter",
        "niceName": "Background Blur Filter",
        "description": "Blur the areas of a Shape that sit within another Shape.",
        "type": "layer"
    },
    {
        "feature": "bend",
        "niceName": "Bend",
        "description": "Deform Shapes by bending them around the circumference of a circle.",
        "type": "layer"
    },
    {
        "feature": "component",
        "niceName": "Component",
        "description": "Collect Layers and promote attributes to create a simplified, custom container.",
        "type": "layer"
    },
    {
        "feature": "controlCentre",
        "niceName": "Control Centre",
        "description": "Promote the most important attributes for easy access.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/control-centre/"
    },
    {
        "feature": "planarCamera",
        "niceName": "Camera",
        "description": "Compose and view Shapes within a 2.5D viewport.",
        "type": "layer"
    },
    {
        "feature": "contoursToSubMeshes",
        "niceName": "Contours To Sub-Meshes",
        "description": "Convert Path Contours within Shapes into Sub-Meshes.",
        "type": "layer"
    },
    {
        "feature": "chopPath",
        "niceName": "Chop Path",
        "description": "Chop a Shape into several slices.",
        "type": "layer"
    },
    {
        "feature": "chromaKeyFilter",
        "niceName": "Chroma Key Filter",
        "description": "Remove green/blue screen from video/images with advanced matte controls.",
        "type": "plugin"
    },
    {
        "feature": "dynamicRendering",
        "niceName": "Dynamic Rendering",
        "description": "Generate different values at render time to automate render pipelines.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/render-manager/dynamic-rendering/"
    },
    {
        "feature": "extrude",
        "niceName": "Extrude",
        "description": "Add 2d extrusions to Shapes.",
        "type": "layer"
    },
    {
        "feature": "forgeDynamicsShape",
        "niceName": "Forge Dynamics",
        "description": "Use simulated physics to drive your animations.",
        "type": "layer"
    },
    {
        "feature": "glowFilter",
        "niceName": "Glow Filter",
        "description": "Add a glow effect to a Shape with controls for individual RGB channels.",
        "type": "layer"
    },
    {
        "feature": "googleSheets",
        "niceName": "Google Sheets",
        "description": "Integrate with a live data source via Google Sheets.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/assets-window/google-sheets-asset/"
    },
    {
        "feature": "isolinesShape",
        "niceName": "Isolines Shape",
        "description": "Convert images or Shape Layers into Contours.",
        "type": "layer"
    },
    {
        "feature": "javaScriptAPI",
        "niceName": "JavaScript API",
        "description": "Write scripts that perform custom workflows.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/tech-info/scripting/getting-started/"
    },
    {
        "feature": "javaScriptLayers",
        "niceName": "JavaScript Layers",
        "description": "Create bespoke Shapes, Deformers and Utilities.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/nodes/general/javascript-layers/"
    },
    {
        "feature": "layoutGroup",
        "niceName": "Layout Group",
        "description": "Create responsive layouts that react to the Composition.",
        "type": "layer"
    },
    {
        "feature": "luminanceBlur",
        "niceName": "Luminance Blur Filter",
        "description": "Blur one Layer based on the luminance values of another.",
        "type": "layer"
    },
    {
        "feature": "lottieExport",
        "niceName": "Lottie Export",
        "description": "Export lightweight animation suitable for use in applications and on the web.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/render-manager/lottie-export/"
    },
    {
        "feature": "meshShape",
        "niceName": "Mesh Shape",
        "description": "Create a mesh by adding control vertices to deform images or Shaders.",
        "type": "layer"
    },
    {
        "feature": "pixelSortingFilter",
        "niceName": "Pixel Sorting Filter",
        "description": "Reorder a Layer's pixels by sorting them according to various attributes such as brightness.",
        "type": "layer"
    },
    {
        "feature": "preCompOverride",
        "niceName": "Pre-Comp Override",
        "description": "Override attributes within Compositions to create templates.",
        "type": "layer"
    },
    {
        "feature": "radius",
        "niceName": "Radius",
        "description": "Generate the radius for a circle which encompasses several Shapes.",
        "type": "layer"
    },
    {
        "feature": "referencing",
        "niceName": "Referencing",
        "description": "Import other Cavalry scene files as 'Assets' and then use them as a 'Pre-Comp'.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/assets-window/referencing/"
    },
    {
        "feature": "schedulingGroup",
        "niceName": "Scheduling Group",
        "description": "Procedurally position layers in time.",
        "type": "layer"
    },
    {
        "feature": "scrapeFilter",
        "niceName": "Scrape Filter",
        "description": "Stretch pixels from a line to create a smeared effect.",
        "type": "layer"
    },
    {
        "feature": "crtScanLines",
        "niceName": "Scan Lines Filter",
        "description": "Mimic the effect of a CRT monitor.",
        "type": "layer"
    },
    {
        "feature": "segmentPath",
        "niceName": "Segment Path",
        "description": "Segment Paths into smaller sections to create a sub-mesh.",
        "type": "layer"
    },
    {
        "feature": "shortestPath",
        "niceName": "Shortest Path",
        "description": "Find the shortest path between a start and end position via a Distribution of Points.",
        "type": "layer"
    },
    {
        "feature": "slitScanFilter",
        "niceName": "Slit Scan Filter",
        "description": "Create an animated fly-through effect.",
        "type": "layer"
    },
    {
        "feature": "smartFolders",
        "niceName": "Smart Folders",
        "description": "Reference image and audio assets by name for automation.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/assets-window/image-smart-folder/"
    },
    {
        "feature": "spheriseFilter",
        "niceName": "Spherise Filter",
        "description": "Map an input Shape onto a sphere that can be rotated.",
        "type": "plugin"
    },
    {
        "feature": "sound",
        "niceName": "Sound",
        "description": "Playback audio and drive deformation or values.",
        "type": "layer"
    },
    {
        "feature": "squashAndStretch",
        "niceName": "Squash and Stretch",
        "description": "Squash and stretch Shapes with options to add bulge and preserve a Shape's area.",
        "type": "layer"
    },
    {
        "feature": "timelineCounter",
        "niceName": "Timeline Counter",
        "description": "Use markers to accumulate or trigger a value over time.",
        "type": "layer"
    },
    {
        "feature": "trackingTool",
        "niceName": "Tracking Tool",
        "description": "Track flat surfaces (planes) in video footage to overlay graphics/animation.",
        "type": "feature",
        "url": "https://docs.cavalry.scenegroup.co/user-interface/menus/tool-menu/tracking-tool/"
    },
    {
        "feature": "travel",
        "niceName": "Travel",
        "description": "Move the start points along all Contours within a Path.",
        "type": "layer"
    },
    {
        "feature": "voronoiShader",
        "niceName": "Voronoi Shader",
        "description": "Generate a cellular pattern by calculating the distances between a lattice of points.",
        "type": "layer"
    }
]

var imageLocation = ui.scriptLocation;

// Set colours
var featureBaseColor = "#404040";
var featureHoverColor = "#444444";

var layerBaseColor = "#404040";
var layerHoverColor = "#444444";

// Create Flow Layout
var flowLayout = new ui.FlowLayout(2, 2);
flowLayout.setSpaceBetween(2);
flowLayout.setMargins(2, 4, 4, 2);

// Create header
var header = new ui.VLayout();
var headerBar = new ui.Label("");
headerBar.setBackgroundColor("#404040");
headerBar.setSize(263, 6);
ui.setMargins(0, 0, 0, 0);
var headerInfo = new ui.Label("");
headerInfo.setMarkdown("Click a **Pro feature** below to load a simple example or to find out more.");
headerInfo.setToolTip("Note that Starter users will be switched to 'Restricted Mode'\nwhich prevents saving or rendering.\nRemove the Pro Layer to exit 'Restricted Mode'.");
header.setMargins(10, 10, 10, 10);
header.add(headerInfo);

var mainLayout = new ui.VLayout();

// Populate the UI with the feature dictionary
Object.keys(features).forEach(function (featureName) {
    const feature = features[featureName];

    // Create the icon
    if (feature.type == "layer") {
        var featureIcon = new ui.Image(api.getAppAssetsPath() + "/icons/nodes/" + feature.feature + ".png");
    } else if (feature.type == "plugin") {
        var featureIcon = new ui.Image(api.getAppAssetsPath() + "/Plugins/" + feature.niceName + "/" + feature.feature + ".png");
    } else {
        var featureIcon = new ui.Image(api.getAppAssetsPath() + "/icons/features/" + feature.feature + ".png");
    }
    // Create the label
    const featureLabel = new ui.Label(feature.niceName);
    featureLabel.setTextColor("#F1F1F1");
    featureLabel.setMinimumWidth(200);

    // Create the description
    const descriptionLabel = new ui.Label(feature.description);
    descriptionLabel.setTextColor("#DDDDDD");

    // Build the feature container layout
    const topRow = new ui.HLayout();

    topRow.add(featureIcon);
    topRow.add(featureLabel);
    topRow.addStretch();
    // Add the url link icon
    const linkIcon = new ui.Image(api.getAppAssetsPath() + "/icons/revealIn-PreComp.png");
    if (feature.type == "feature") {
        topRow.add(linkIcon);
    }

    const bottomRow = new ui.HLayout();
    bottomRow.addSpacing(2);
    bottomRow.add(descriptionLabel);

    const vertLayout = new ui.VLayout();
    vertLayout.add(topRow);
    vertLayout.add(bottomRow);
    vertLayout.addStretch();

    // Create and set the container colours
    const container = new ui.Container();

    container.setRadius(3, 3, 3, 3);
    container.setSize(240, 70 + extraHeight);
    if (feature.type == "layer") {
        container.setBackgroundColor(layerBaseColor);
    } else {
        container.setBackgroundColor(featureBaseColor);
    }
    container.useHoverEvents(true);
    container.setLayout(vertLayout);

    // Create a Timer to prevent double click
    var timer = new api.Timer(callbackObj);
    timer.setInterval(1000);
    timer.setRepeating(false);

    // Link to scripts or docs
    container.onMousePress = function (position, button) {
        if (button == "left") {
            if (timer.isActive()) {
                return;
            }
            timer.start();
            if (["layer", "plugin"].includes(feature.type)) {
                api.load(ui.scriptLocation + "/pro-scripts/" + feature.feature + ".js");
            } else {
                api.openURL(feature.url);
            }
        }
    }
    // Create the Hover events
    container.onMouseEnter = function () {
        container.setBackgroundColor(layerHoverColor);
    }
    container.onMouseLeave = function () {
        if (feature.type == "layer") {
            container.setBackgroundColor(layerBaseColor);
        } else {
            container.setBackgroundColor(featureBaseColor);
        }
    }
    // Add the containers to the Flow Layout
    flowLayout.add(container);
});

ui.addCallbackObject(callbackObj);

// Show the window
ui.add(headerBar);
ui.add(mainLayout);
mainLayout.add(header);
mainLayout.add(flowLayout);
ui.setFixedWidth(263);