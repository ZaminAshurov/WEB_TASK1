PWA Task Tracker: Architecture & Testing Guide

This document answers the required grading questions regarding the application's architecture, offline capabilities, and data migration strategy.

1. Detailed Architectural / Systems Diagram

Our solution is a "Local-First" Progressive Web App (PWA). This architecture ensures the application is 100% functional without a network connection by storing the application itself (the "App Shell") and the user's data directly on the device.

Core Components

Client Application (index.html): This is the single HTML file that acts as the main application. It contains:

UI (HTML & Tailwind CSS): The complete user interface.

App Logic (JavaScript): All JavaScript code for handling user interactions (clicks, form submissions).

Database Logic (JavaScript): The code responsible for all CRUD (Create, Read, Update, Delete) operations against the local IndexedDB database.

Service Worker (sw.js): A JavaScript file that runs in the background, separate from the web page. It acts as a network proxy.

On install: It saves the "App Shell" (see below) into Cache Storage.

On fetch: It intercepts all outgoing network requests. Using a "Cache-First" strategy, it checks if the requested file is in the cache. If yes, it serves it from the cache (working offline). If no, it tries to get it from the network.

On activate: This event fires when a new service worker replaces an old one. We use this to perform cache busting by deleting any old, outdated caches (e.g., v1, v2) to ensure the user gets the new version of the app.

Cache Storage (The "App Shell"): A browser storage area where the Service Worker saves the static files that make up the application itself:

index.html

manifest.json

picture1.png, picture2.png

https.cdn.tailwindcss.com (the CSS file)

When the app is updated, this entire cache is deleted and rebuilt, but the user's data is untouched.

IndexedDB (User Data): A client-side NoSQL database.

This is where we store all user-generated tasks.

This data is persistent and completely separate from the Cache Storage. This is why all tasks remain even after a "new deploy" (cache bust).

The onupgradeneeded event handler is our data migration mechanism. It runs only when the DB_VERSION in the code is higher than the version in the user's browser, allowing us to safely add new tables or columns (indexes) without losing existing data.

2. Grader's Guide: Testing & Data Reconciliation

The code provided is fully functional and can be tested using Chrome DevTools.

A. Testing Offline/Slow-3G CRUD Operations

Setup:

Run the app using VS Code's "Live Server".

Open Chrome DevTools (F12) and go to the Network tab.

Find the "Throttling" dropdown (default is "No throttling").

Select "Offline" or "Slow 3G".

Test Cases (Perform while "Offline"):

Create: Add a new task (e.g., "Offline Task 1"). It will appear in the list.

Read: Refresh the page (F5). The app will load perfectly, and "Offline Task 1" will still be there (loaded from IndexedDB).

Update: Mark "Offline Task 1" as complete. Refresh the page again. The "complete" state will be saved.

Delete: Delete "Offline Task 1". Refresh the page. The task will be gone.

All CRUD operations are resilient to network failure because they interact only with the local IndexedDB, not a server.

B. Testing Data Migration (After a "New Deploy")

This test simulates deploying a new version of the app that requires a database schema change.

Add Data: Make sure you have several tasks in your app.

Simulate "New Deploy" (Code Change): In index.html, find the JavaScript for the database (around line 90).

Change 1 (DB Version): Modify const DB_VERSION = 1; to const DB_VERSION = 2;.

Change 2 (Migration Logic): Inside the db.onupgradeneeded function, add a new index to simulate a schema change.

// ... inside db.onupgradeneeded = (event) => { ...
store.createIndex('completed', 'completed', { unique: false });

// --- ADD THIS MIGRATION LOGIC ---
if (event.oldVersion < 2) {
  console.log('Migrating to v2: Adding a "priority" index.');
  store.createIndex('priority', 'priority', { unique: false });
}
// --- END OF MIGRATION LOGIC ---
// ... }


Run the Migration: Save index.html and refresh the browser.

Verify:

Check the Console. You will see your log: "Migrating to v2: Adding a "priority" index."

No data was lost. All your original tasks are still present.

This confirms the app successfully migrates local data on deploy.

(Note: We also test "App Shell" updates by changing CACHE_NAME in sw.js, which forces the activate event to delete the old cache and install the new app files, all without touching the IndexedDB data).

C. Server Reconciliation (How to Implement)

This application is currently local-first and does not have a server backend. The prompt, however, requires a design that can "reconcile with the server without data loss or duplicate tasks."

Our architecture is designed to support this. Here is how we would implement reconciliation:

Prevent Duplicates (UUIDs): When a new task is created, we would generate a client-side UUID (Universally Unique Identifier) for its id instead of using Date.now(). This ensures a task has a globally unique ID before it ever reaches a server.

Sync Queue (IndexedDB): We would add a new "dirty" or "unsynced" flag to the task object in IndexedDB.

Sync Logic (JavaScript):

We would add a syncTasks() function.

This function would listen for the navigator.onLine event.

When the app comes online, it would query IndexedDB for all tasks where unsynced === true.

It would then POST these tasks (with their UUIDs) to a server API.

The server would use the client-generated UUID as the primary key. If it receives a task with a UUID it already has, it simply updates it (this is called an "upsert"), preventing any duplicate tasks.

On a successful POST, the client would mark the task as unsynced = false in IndexedDB.
