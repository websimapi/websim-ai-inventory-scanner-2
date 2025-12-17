// app.js
// Main Application Logic

import { initCamera, takeSnapshot } from './camera.js';
import { loadModel, detectObjects } from './ai.js';
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
let currentGroupedResults = [];
let selectedGroupIndex = 0;

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
    
    // 1. Capture basic snapshot to canvas
    takeSnapshot(videoEl, canvasEl);
    
    // 2. Run Object Detection
    currentPredictions = await detectObjects(videoEl);
    
    // 3. Draw Bounding Boxes on Canvas
    const ctx = canvasEl.getContext('2d');
    ctx.font = '18px sans-serif';
    ctx.textBaseline = 'top';

    currentPredictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const color = '#00e676';
        
        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        
        // Label background
        const textWidth = ctx.measureText(prediction.class).width;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, textWidth + 10, 24);
        
        // Label text
        ctx.fillStyle = '#000000';
        ctx.fillText(prediction.class, x + 5, y + 2);
    });

    // 4. Get updated image data
    const annotatedImageSrc = canvasEl.toDataURL('image/png');
    
    // 5. Group results by class
    processDetections(currentPredictions);

    // 6. Show Results
    showResultModal(annotatedImageSrc);
    
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
    
    // Get the currently selected group details
    const selectedGroup = currentGroupedResults[selectedGroupIndex];
    // If user typed a completely new name, we still use the count from the selected group
    // or default to 1 if something weird happened.
    const count = selectedGroup ? selectedGroup.count : 1;
    const confidence = selectedGroup ? selectedGroup.avgScore : 0.9;
    
    saveItem(finalName, count, confidence);
    
    updateInventoryCount();
    resultModal.classList.add('hidden');
    
    // Feedback
    aiStatus.innerText = `Saved: ${count} x ${finalName}`;
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
function processDetections(predictions) {
    const groups = {};
    
    predictions.forEach(p => {
        if (!groups[p.class]) {
            groups[p.class] = { 
                name: p.class, 
                count: 0, 
                totalScore: 0 
            };
        }
        groups[p.class].count++;
        groups[p.class].totalScore += p.score;
    });

    // Convert to array and sort by count (descending)
    currentGroupedResults = Object.values(groups).map(g => ({
        name: g.name,
        count: g.count,
        avgScore: g.totalScore / g.count
    })).sort((a, b) => b.count - a.count);
}

function showResultModal(imageSrc) {
    detectedSnapshot.src = imageSrc;
    predictionList.innerHTML = '';
    
    if (currentGroupedResults.length > 0) {
        // Auto-select first group (highest count)
        selectedGroupIndex = 0;
        itemNameInput.value = currentGroupedResults[0].name;
        
        currentGroupedResults.forEach((group, index) => {
            const div = document.createElement('div');
            div.className = `prediction-item ${index === 0 ? 'selected' : ''}`;
            
            div.innerHTML = `
                <span>${group.name}</span>
                <span class="count-badge">x${group.count}</span>
            `;
            
            div.addEventListener('click', () => {
                selectedGroupIndex = index;
                itemNameInput.value = group.name;
                document.querySelectorAll('.prediction-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
            });
            
            predictionList.appendChild(div);
        });
    } else {
        predictionList.innerHTML = '<div style="padding:10px; color:#aaa">No objects detected.</div>';
        itemNameInput.value = "";
        selectedGroupIndex = -1;
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

