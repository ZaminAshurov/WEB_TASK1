
#   **PWA Task Tracker**

This architecture describes how the PWA supports  **fully offline task management**,  **safe syncing**, and  **seamless upgrades**  without losing data.

The design relies on four core components:

----------

## **1. App Shell (UI Layer)**

-   HTML/CSS/JS loaded from the  **Service Worker cache**  for instant offline startup.
    
-   When the user adds/edits/deletes tasks, the UI updates  **optimistically**  (immediate visual response).
    
-   All changes are written instantly to  **IndexedDB**  and added to a  **local operation queue**  (outbox) for later synchronization.
    

----------

## **2. IndexedDB (Versioned Local Database)**

Stores:

-   `tasks`  — the user's task list
    
-   `queue`  — offline operations waiting to sync
    
-   On app updates,  **DB migrations**  run inside  `onupgradeneeded`.
    
-   Migrations transform existing data so older versions remain compatible with newer releases.
    

----------

## **3. Service Worker (Caching & Offline Engine)**

-   Precaches the app shell using a  **cache-first**  strategy.
    
-   Uses a  **new cache version per deploy**, enabling  **cache-busting**.
    
-   During the  `activate`  event, old caches are removed and a  `SW_UPDATED`  message is sent to clients.
    
-   API requests use a  **network-first**  strategy; __if unreachable__, operations are added to the queue until the network returns.
    

----------

## **4. Sync & Reconciliation Engine**

When the network becomes available:

1.  Dequeues operations from  `queue`.
    
2.  Sends them to the server using  **stable, client-generated task IDs**  (prevents duplicates).
    
3.  The server returns canonical task data.
    
4.  IndexedDB is updated and synced operations are removed from the queue.
    

Even if a new deployment occurred while offline:

-   Local tasks and the queue remain intact.
    
-   DB migrations run safely.
    

----------

# 📊  **Diagrams**

----------

# **Diagram 1 — System Architecture Overview**

```
+------------------------------+
|          App Shell           |
|  (UI, Forms, JS Logic)       |
|  + Sync Engine               |
+--------------+---------------+
               |
               v
+------------------------------+
|        IndexedDB (Local)     |
|  - tasks store               |
|  - queue store (outbox)      |
|  - versioned schema          |
+--------------+---------------+
               ^
               |
               v
+------------------------------+
|      Service Worker          |
|  - Precache app shell        |
|  - Runtime caching           |
|  - Cache-busting on deploy   |
|  - Offline routing           |
+--------------+---------------+
               |
               v
+------------------------------+
|        Server API            |
|  - CRUD for tasks            |
|  - Idempotent operations     |
+------------------------------+

```

----------

# **Diagram 2 — Offline CRUD & Sync Flow**

```
User Action      Client UI          IndexedDB           SW/API
-----------------------------------------------------------------------
Add Task  --->  Render instantly -> Save task -------> (No network)
                                 -> Queue op          -> Offline mode

```

When the network returns:

```
Network ON --> Sync Engine --> Read queue --> Send ops --> Server
                                     |                     |
                                     v                     |
                             Update tasks store <----------
                             Clear synced ops

```

----------

# **Diagram 3 — Deployment & Cache Busting**

```
          New Deploy Published
                    |
           New Service Worker
                    |
            SW 'install' event
                    |
          Precache new assets
                    |
            SW 'activate' event
                    |
   - Delete old caches
   - Broadcast "SW_UPDATED"
                    |
           Client receives msg
                    |
       Run DB migrations (if any)
                    |
        Reload UI with new app

```

----------

#   **Final Summary**

This architecture ensures the PWA remains fully functional offline, safely reconciles data when reconnected, and upgrades seamlessly across deployments without losing or duplicating user tasks.
