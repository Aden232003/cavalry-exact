// Copyright 2025 Scene Group Ltd.

let name = api.getNiceName(atEd.layerId);
let rect = api.primitive("rectangle", name+" Rectangle");
api.connect(atEd.layerId, "position", rect, "position");
api.connect(atEd.layerId, "size", rect, "generator.dimensions");