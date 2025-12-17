// app.js
// Main Application Logic

import { initCamera, takeSnapshot } from './camera.js';
import { loadModel, classifyImage } from './ai.js';
import { getInventory, saveItem, clearInventory, exportInventory } from './storage.js';

// DOM Elements
const videoEl = document.getElementById('camera-feed');
const canvasEl = document.getElementById('capture-canvas');
const scanBtn = document.getElementById('scan-btn');
const loadingScreen = document.getElementById('loading-screen');
const aiStatus = document.getElementById('ai-status');
const toggleInvBtn = document.getElementById('toggle-inventory-btn');
const closeInvBtn = document.getElementById('close-inventory-btn');
const inventoryDrawer = document.getElementById('inventory-drawer');
const itemCountBadge = document.getElementById('item-count-badge');
const resultModal = document.getElementById('result-modal');
const detectedSnapshot = document.getElementById('detected-snapshot');
const predictionList = document.getElementById('prediction-list');
const itemNameInput = document.getElementById('item-name-input');
const saveBtn = document.getElementById('save-btn');
const discardBtn = document.getElementById('discard-btn');
const inventoryList = document.getElementById('inventory-list');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');

// Audio
const beepSound = new Audio('scan_beep.mp3');

// State
let currentPredictions = [];

async function main() {
    try {
        updateInventoryCount();
        
        // 1. Initialize Camera
        await initCamera(videoEl);
        
        // 2. Load AI Model
        await loadModel();
        
        // 3. App Ready
        loadingScreen.classList.add('hidden');
        aiStatus.innerText = "System Ready";
        aiStatus.classList.add('ready');
        scanBtn.disabled = false;
        
    } catch (err) {
        console.error(err);
        aiStatus.innerText = "Error: " + err.message;
        alert("Failed to initialize: " + err.message);
    }
}

// Event Listeners
scanBtn.addEventListener('click', async () => {
    // Feedback
    beepSound.play().catch(e => console.log("Audio play failed", e));
    scanBtn.disabled = true;
    scanBtn.innerText = "Processing...";
    
    // Capture
    const snapshotData = takeSnapshot(videoEl, canvasEl);
    
    // Analyze
    // We pass the video element itself to TFJS (it's faster than converting to image data manually)
    currentPredictions = await classifyImage(videoEl);
    
    // Show Results
    showResultModal(snapshotData, currentPredictions);
    
    scanBtn.disabled = false;
    scanBtn.innerText = "SCAN ITEM";
});

toggleInvBtn.addEventListener('click', () => {
    renderInventory();
    inventoryDrawer.classList.remove('hidden');
});

closeInvBtn.addEventListener('click', () => {
    inventoryDrawer.classList.add('hidden');
});

discardBtn.addEventListener('click', () => {
    resultModal.classList.add('hidden');
});

saveBtn.addEventListener('click', () => {
    const finalName = itemNameInput.value.trim();
    if (!finalName) return;
    
    const confidence = currentPredictions[0] ? currentPredictions[0].probability : 0;
    saveItem(finalName, confidence);
    
    updateInventoryCount();
    resultModal.classList.add('hidden');
    
    // Small success feedback
    aiStatus.innerText = `Saved: ${finalName}`;
    setTimeout(() => {
        aiStatus.innerText = "System Ready";
    }, 2000);
});

clearBtn.addEventListener('click', () => {
    if(confirm("Delete all inventory data?")) {
        clearInventory();
        renderInventory();
        updateInventoryCount();
    }
});

exportBtn.addEventListener('click', () => {
    exportInventory();
});

// Helper Functions
function showResultModal(imageSrc, predictions) {
    detectedSnapshot.src = imageSrc;
    predictionList.innerHTML = '';
    
    if (predictions.length > 0) {
        // Auto-select first prediction
        itemNameInput.value = predictions[0].className;
        
        predictions.forEach((pred, index) => {
            const div = document.createElement('div');
            div.className = `prediction-item ${index === 0 ? 'selected' : ''}`;
            const percentage = (pred.probability * 100).toFixed(1) + '%';
            
            div.innerHTML = `
                <span>${pred.className}</span>
                <span>${percentage}</span>
            `;
            
            div.addEventListener('click', () => {
                itemNameInput.value = pred.className;
                document.querySelectorAll('.prediction-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
            });
            
            predictionList.appendChild(div);
        });
    } else {
        predictionList.innerHTML = '<div style="padding:10px; color:#aaa">No clear objects detected.</div>';
        itemNameInput.value = "";
    }
    
    resultModal.classList.remove('hidden');
}

function updateInventoryCount() {
    const inv = getInventory();
    const totalCount = inv.reduce((sum, item) => sum + item.count, 0);
    itemCountBadge.innerText = totalCount;
}

function renderInventory() {
    const inv = getInventory();
    inventoryList.innerHTML = '';
    
    if (inv.length === 0) {
        inventoryList.innerHTML = '<div class="empty-state">No items scanned yet.</div>';
        return;
    }
    
    // Sort by last scanned (newest first)
    inv.sort((a, b) => new Date(b.lastScanned) - new Date(a.lastScanned));
    
    inv.forEach(item => {
        const date = new Date(item.lastScanned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.innerHTML = `
            <div class="inventory-item-info">
                <h4>${item.name}</h4>
                <p>Last scan: ${date}</p>
            </div>
            <div class="inventory-count">x${item.count}</div>
        `;
        inventoryList.appendChild(div);
    });
}

// Start
main();

