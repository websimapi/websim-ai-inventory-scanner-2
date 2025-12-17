// storage.js
// Handles LocalStorage for inventory

const STORAGE_KEY = 'inventory_v1';

export function getInventory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function saveItem(name, count, confidence) {
    const inventory = getInventory();
    
    // Check if item already exists to group them
    const existingIndex = inventory.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex >= 0) {
        inventory[existingIndex].count += count;
        inventory[existingIndex].lastScanned = new Date().toISOString();
    } else {
        inventory.push({
            id: Date.now().toString(),
            name: name,
            confidence: confidence,
            count: count,
            firstScanned: new Date().toISOString(),
            lastScanned: new Date().toISOString()
        });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    return inventory;
}

export function clearInventory() {
    localStorage.removeItem(STORAGE_KEY);
}

export function exportInventory() {
    const inventory = getInventory();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inventory, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "inventory_scan.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

