---
title: Release Notes & History
description: Evolution of the Sharpino library across versions.
---

# Release Notes & History

This log tracks major feature updates and version milestones of the Sharpino library.

---

## 6.1.x
- **Extended Decision Boundary:** Introduces cross-aggregates constraint lambda execution (`runThreeAggregateCommandsMdAsync3`, etc.) that allows locking external streams under optimistic concurrency check.
- Added lazy constraint variations of command runner APIs.

---

## 6.0.x
- **Postgres Optimistic Lock Control:** Switched optimistic lock control validation entirely to Postgres stored procedures.
- **Cache Memory Limits:** Introduced L1 configuration parameters to limit cache count and memory footprints:
  - `Cache:AggregateCacheMaxSize`
  - `Cache:AggregateCacheMaxMemoryMegabytes`
  - `Cache:AggregateCacheMemoryLoadThreshold`
- **Postgres LISTEN/NOTIFY Backplane:** Added support for L1 cache eviction messages and L2 synchronization using PG native listen/notify channels.

---

## 5.0.x
- **Snapshot Upcasting:** Native support to evolve, replace, and upcast database-level snapshots.
- **GDPR compliance updates:** Added async methods to erase or replace sensitive data in events and snapshots.

---

## 4.8.x - 4.9.x
- Moved settings from `sharpinoSettings.json` to the standard ASP.NET `appSettings.json`.
- Added standard cancellation token parameters to all core StateView and CommandHandler functions.
- Introduced predicate-based soft-deletion for aggregates.

---

## 4.5.x
- **Refreshable Details:** Introduced `Refreshable` and `RefreshableAsync` cached composite read models.
- **Async command executions:** Migrated core database calls and cache fetches to async/task-based patterns.

---

## 3.x
- Integrated state caches (`StateCache2`).
- Transport Tycoon sample (`Sample 8`) added.

---

## 2.x
- Ditched Newtonsoft.Json in favor of **FsPickler** binary and JSON serialization support.
- Replaced Kafka notifications with PostgreSQL-centric notification triggers and standard message senders.
