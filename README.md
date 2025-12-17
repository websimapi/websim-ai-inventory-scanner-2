# AI Inventory Scanner

This is a web-based inventory scanner that utilizes TensorFlow.js (which can leverage WebNN backends where available) to identify objects via the device camera.

## Features
-   **Mobile-First Design**: Optimized for single-screen usage.
-   **Object Detection**: Uses COCO-SSD to detect and count multiple objects in a single scan.
-   **Inventory Management**: Adds items to a local inventory database, grouping by name.
-   **Data Persistence**: Uses LocalStorage to save data between sessions.
-   **Export**: Capability to export inventory as JSON.

## Usage
1.  Allow camera access.
2.  Point camera at an object.
3.  Press "SCAN ITEM".
4.  Confirm the detected object name or edit it.
5.  Save to inventory.
6.  View inventory by clicking the box icon in the top right.

