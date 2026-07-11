---
title: Aggregate Cache
description: Aggregate Caching in Sharpino.
---

# Aggregate Cache

The aggregate cache key is a pair of the `eventId` and `aggregateId`, and its value is a task returning a result containing the actual state. 
Here is a surface-level explanation:

### Cache Goal
The main goal of the cache is to maintain and keep an up-to-date version of any aggregate. Moreover, the aggregate state is paired with the version (eventId) of the aggregate so that it can be used for concurrency control (optimistic lock) by the eventstore at write time. Any attempt to emit events based on an aggregate state whose version (`eventId`) does not match the version stored in the event store will result in the rejection of the write operation. This makes it crucial to ensure that the cache remains up to date. 

There are essentially two ways to feed the cache (or, more properly, how components of the framework utilize the cache):

1. **Traditional "memoize"** by passing a function aimed at returning an up-to-date state of the aggregate according to the source of truth (the event store).
In this case, we have a StateView component that manages the retrieval of the aggregate state from the event store. Instead of calling the retrieval function directly, it wraps the function in a delayed expression (or Thunk) and passes it as an argument to the memoize function. The key for the element is a pair consisting of the `eventId` (version) and the `aggregateId`. If the element with that key is already present, the function is not evaluated. This approach raises the question of whether stale data can exist in the cache. To address this, the only way to add new events to the event store (which would make cache data stale) is to also update the cache. The commandHandler component _does_ ensure that any successful action updating the events in the event store also updates the cache. This is guaranteed by the behavior of all `runAggregateCommand`-related functions. 
Summary: In a single-node setup, any data fed to the event store will also feed the L1 cache, keeping them in sync. Note: You can test this behavior by manually inserting an event directly into the event store without updating the cache. The next command execution will fail with an error because the cache provides an outdated state, causing the optimistic concurrency mechanism to reject the transaction. This experiment shows an expected behavior of the optimistic lock mechanism.

2. **Feeding the cache directly** after successfully executing a command and storing the related events.
When the event store successfully stores events, there is no reason to re-read them to compute the aggregate state, as it is already available from the command execution (which returns both the state and the events). Thus, the system updates the cache with the new state and the new version of the aggregate (obtained from the `eventId` returned by the event store).


