// Copyright 2025 Scene Group Ltd.

// Simple Sound example.

// Create a new Comp.
var newComp = api.createComp("Sound");
api.setActiveComp(newComp);
api.set(newComp, {"resolution": [1920,1080], "backgroundColor": "#6437ff"});

let barCount = 100

// Set the composition length to match the song
let songLengthInFrames = api.timecodeToFrames("00:00:25:00", api.get(api.getActiveComp(), "fps"));
api.set(api.getActiveComp(), {"endFrame": songLengthInFrames, "playbackEnd": songLengthInFrames});

// Create the Rectangle
var rectId = api.primitive("rectangle", "Rectangle");
api.set(rectId, {"material.materialColor": "#ffffff", "generator.dimensions.y": 5, "notes": "The Align is used to pin the Rectangle to its left edge."});

// Create the Align - this will ensure the rectangles grow from the end, not the centre
var alignId = api.create("align", "Align (Rectangle Deformer)");
api.set(alignId, {"x": 1.0});
api.connect(alignId, "id", rectId, "deformers");
api.parent(alignId, rectId);

// Duplicate the Rectangles
var duplicatorId = api.create("duplicator", "Duplicator");
// Connect the Rectangle to the Duplicator
api.connect(rectId, "id", duplicatorId, "shapes");
// Change the Distribution on the Duplicator to Circle
api.setGenerator(duplicatorId, "generator", "circleDistribution");
// Set the Distribution count to the bar count
api.set(duplicatorId, {"generator.count": barCount, "generator.radius": 200, "notes": "The Duplicator's **Count** matches the Sound Behaviour's **Frequency Bands**."});

// Import the Audio Asset
var audioPath = `${api.getAppAssetsPath()}/Audio/Danza.mp3`;
var assetId = api.loadAsset(audioPath, false);

// Create the Sound Behaviour
var soundId = api.create("sound", "Sound Behaviour");
// The weighting graph change below will keep the bass frequencies from growing too long
api.set(soundId, {"strength": 400, "bands": barCount, "weightingGraph.0.position": {"x": 0.0, "y": 0.25}, "notes": "The Rectangle's height is being driven by the Sound Behaviour."});
// Connect the Audio Asset to the Sound Behaviour
api.connect(assetId, "id", soundId, "file");
// the Sound Behaviour will control the width of the rectangles
api.connect(soundId, "id", rectId, "generator.dimensions.x");

// Refresh UI
api.select([]);
api.updateAppTitleBar();

api.play();
