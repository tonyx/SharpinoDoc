---
title: Aggregate Cache
description: Aggregate Caching in Sharpino.
---

# Aggregate Cache

In Sharpino, the aggregate cache (`AggregateCache3`) is keyed by the `aggregateId` string (`aggregateId.ToString()`), and its value is a `CachedAggregateEntry` pairing the calculated domain state with its version (`eventId`).

### Cache Structure: `CachedAggregateEntry`

To enable multi-tier L1/L2 caching across distributed nodes without compromising in-memory execution speed, `AggregateCache3` stores a dual-tier entry:

```fsharp
[<CLIMutable>]
type CachedAggregateEntry = {
    EventId: EventId
    TypeName: string
    StateJson: string
    [<System.Text.Json.Serialization.JsonIgnore>]
    mutable BoxedState: obj option
}
```

- **Level 1 (In-Memory) Hit:** Uses `BoxedState` containing a live pointer to the aggregate state object. Reading from L1 avoids any JSON deserialization overhead and executes in sub-microsecond time.
- **Level 2 (Distributed Cache) Serialization:** When written or replicated to L2 (PostgreSQL, Redis, or SQL Server), the entry serializes cleanly to JSON. When another node cold-starts or experiences an L1 eviction, it fetches `CachedAggregateEntry` from L2, lazily rehydrates `BoxedState`, and resumes fast in-memory execution.

### Cache Goal
The main goal of the cache is to maintain and keep an up-to-date version of any aggregate. Moreover, the aggregate state is paired with the version (`eventId`) of the aggregate so that it can be used for concurrency control (optimistic lock) by the event store at write time. Any attempt to emit events based on an aggregate state whose version (`eventId`) does not match the version stored in the event store will result in the rejection of the write operation. This makes it crucial to ensure that the cache remains up to date. 

There are essentially two ways to feed the cache (or, more properly, how components of the framework utilize the cache):

1. **Memoization & Snapshot Read-Through via `StateView`:**
   When rebuilding or querying an aggregate state, `StateView` (`getLastAggregateSnapshot` / `getLastAggregateSnapshotAsync`) checks `AggregateCache3.Instance.GetEntry / GetEntryAsync(aggregateId)` first.
   If present in L1 or L2, the cached snapshot is used directly, avoiding a database snapshot query. Reconstitution then only replays the delta events occurring *after* that snapshot's `eventId`. If not found in cache, `StateView` falls back to the database snapshot table and memoizes the calculated state via `Memoize2`.
   The `commandHandler` component ensures that any successful action updating the events in the event store also updates the cache. This is guaranteed by the behavior of all `runAggregateCommand`-related functions.

2. **Feeding the Cache Directly after Command Execution:**
   When the event store successfully stores events, there is no reason to re-read them to compute the aggregate state, as it is already available from the command execution (which returns both the state and the events). Thus, `commandHandler` updates `AggregateCache3` with the new state and the new version of the aggregate (obtained from the `eventId` returned by the event store) via `Memoize2 (eventId, newState |> box) aggregateId`.

In multi-node architectures, `Memoize2` also serializes the entry to L2 distributed cache and publishes an `EntrySet` backplane notification, allowing peer nodes to evict stale local L1 memory and fetch the fresh entry from L2 on their next read.
