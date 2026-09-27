// Copyright 2025 Scene Group Ltd.

const seed = Date.now()

/// Super Shape really only likes even degrees (1 looks okay though)
let degreeRnd = cavalry.random(1, 16, seed, 0)
let degreeAdjusted = Math.round(degreeRnd)
if (degreeAdjusted > 1 && degreeAdjusted % 2 !== 0) {
	degreeAdjusted += (degreeAdjusted === 1) ? 1 : -1
}

let n1Rnd = cavalry.random(0.5, 10, seed, 1)
let n2Rnd = cavalry.random(0.5, 10, seed, 2)
let n3Rnd = cavalry.random(0.5, 20, seed, 3)
let aRnd = cavalry.random(1, 10, seed, 4)
let bRnd = cavalry.random(1, 1.5, seed, 5)

api.set(atEd.layerId, {"complexity": degreeAdjusted, "n1": n1Rnd, "n2": n2Rnd, "n3": n3Rnd, "a": aRnd, "b": bRnd})

