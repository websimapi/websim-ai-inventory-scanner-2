// ai.js
// Handles TensorFlow.js model loading and inference

import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

let model = null;

export async function loadModel() {
    console.log("Loading MobileNet...");
    // MobileNet is efficient for basic object classification
    model = await mobilenet.load({
        version: 2,
        alpha: 1.0 // 1.0 is standard, lower is faster/less accurate
    });
    console.log("Model loaded successfully.");
    return model;
}

export async function classifyImage(imageElement) {
    if (!model) {
        console.error("Model not loaded yet.");
        return [];
    }
    
    // Returns array of { className, probability }
    const predictions = await model.classify(imageElement);
    return predictions;
}

