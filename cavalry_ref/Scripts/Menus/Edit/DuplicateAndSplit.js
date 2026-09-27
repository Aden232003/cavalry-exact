// Copyright 2025 Scene Group Ltd.

const sel = api.getSelection()
for (const layerId of sel) {
    const dupLayerId = api.duplicate(layerId, false)
    api.setInFrame(dupLayerId, api.getFrame())
    api.setOutFrame(layerId, api.getFrame()-1)
}