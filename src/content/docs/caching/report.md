---
title: Cache Invalidation & L2 Report
description: Detailed analysis of cache invalidation paths, L2 eligibility, and snapshot rollbacks.
---

# Cache Invalidation & L2 Flow Report

This report outlines the mechanisms behind cache invalidation, details the role of the L2 SQL Cache, and lists exactly what is cached at each level.

---

## 1. Cache Invalidation Flows

When an aggregate is modified, the node triggers invalidation on peers via **EntryRemove** (eviction) and **EntrySet** (state update) messages over the backplane.

### Flow A: Eviction via `Clean` (EntryRemove)
```mermaid
sequenceDiagram
    participant Node1 as Node 1 (Sender)
    participant BP as Backplane (Service Bus / MQTT)
    participant Node2 as Node 2 (Receiver)
    
    Note over Node1: Clean aggregate X called
    Node1->>Node1: 1. Remove X from L1 statePerAggregate
    Node1->>BP: 2. Publish EntryRemove Message ("statePerAggregate:X")
    
    BP->>Node2: 3. Deliver EntryRemove Message
    Node2->>Node2: 4. Remove X from L1 statePerAggregate
    Node2->>Node2: 5. Evict/Refresh dependent details (DetailsCache)
```

### Flow B: Memoization via `EntrySet`
```mermaid
sequenceDiagram
    participant Node1 as Node 1 (Sender)
    participant BP as Backplane (Service Bus / MQTT)
    participant Node2 as Node 2 (Receiver)
    
    Note over Node1: Node 1 updates state for X
    Node1->>Node1: 1. Clean X (triggers EntryRemove flow above)
    Node1->>Node1: 2. Set new state in local statePerAggregate
    Node1->>BP: 3. Publish EntrySet Message ("statePerAggregate:X")
    
    BP->>Node2: 4. Deliver EntrySet Message
    Node2->>Node2: 5. Remove/Invalidate X from local statePerAggregate
    Node2->>Node2: 6. Evict/Refresh dependent details (DetailsCache)
```

### Peer node updates:
1. When peer Node 2 receives either `EntryRemove` or `EntrySet` for an aggregate key, it invalidates its local L1 cache:
   ```fsharp
   statePerAggregate.Remove(key, receiverOptions)
   ```
2. Peer Node 2 automatically extracts the aggregate `Guid` and triggers a refresh on all associated composite Details:
   ```fsharp
   DetailsCache.Instance.RefreshDependentDetailsAsync(guidKey, Some CancellationToken.None)
   ```

---

## 2. Involvement of L2 Cache in Aggregate Cache

:::note[Important]
**The L2 Cache is NOT involved in the aggregate cache (`AggregateCache3`) flow.**
:::

- `statePerAggregate` caches F# asynchronous Task objects (`Task<Result<EventId * obj, string>>`), which cannot cross process boundaries or be serialized.
- Therefore, the L2 distributed setup is commented out by design.
- Rebuilding aggregate state on cache misses relies instead on **Database Snapshots** (loaded from the DB snapshots table) and replaying only subsequent events.

---

## 3. L2 Cache Contents: What is and isn't stored?

Below is a breakdown of the caches managed in `Cache.fs` and their L2 cache eligibility:

| Cache Component | Purpose | Stored in L1? | Stored in L2? | Why / Why Not? |
| :--- | :--- | :---: | :---: | :--- |
| **`objectDetailsAssociationsCache`** | Maps aggregate IDs to lists of details keys. | **Yes** | **Yes** | Contains plain list/GUID combinations which are fully JSON-serializable. |
| **`statesDetails`** | Caches the actual projected/memoized detail values. | **Yes** | **No** | Caches `RefreshableAsync<'T>` wrappers enclosing live F# closures and type references, which cannot be serialized. |
| **`statePerAggregate`** | Caches the reconstructed aggregate states. | **Yes** | **No** | Stores `Task` objects representing the asynchronous state reconstruction, which cannot be serialized. |

## 4. Supported L2 Cache Providers

- Redis
- Sql
- Postgres

Example of how to configure L2 Cache are shown in the samples from 24 to 28.

Note: a future change will be to transform the value of the entries of the L1 cache from Task<Result<EventId * obj, string>> to  Result<EventId * obj, string> to be able to use them also in the L2 cache. This will avoid that invalidation may require event replay. 
 
