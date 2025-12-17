// ai.js
// Handles TensorFlow.js model loading and inference

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;

export async function loadModel() {
    console.log("Loading COCO-SSD...");
    // COCO-SSD is an object detection model capable of identifying multiple objects
    model = await cocoSsd.load();
    console.log("Model loaded successfully.");
    return model;
}

export async function detectObjects(imageElement) {
    if (!model) {
        console.error("Model not loaded yet.");
        return [];
    }
    
    // Returns array of { bbox: [x, y, width, height], class: "string", score: number }
    const predictions = await model.detect(imageElement);
    return predictions;
}

