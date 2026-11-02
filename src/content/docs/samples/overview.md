---
title: Samples & Examples
description: Overview of Sample projects illustrating Sharpino features.
---

# Samples & Examples

The [tonyx/Sharpino](https://github.com/tonyx/Sharpino) repository contains a collection of sample projects demonstrating specific features, configurations, and use cases.

Here is an overview of the key samples:

---

## Sharpino.Sample.7: Serialization Comparison
- **Purpose:** Demonstrates how to configure and run the library using JSON vs. Binary serialization on PostgreSQL.
- **Key Feature:** Compares identical domain models using FsPickler to serialize to text/plain-text columns versus binary fields in the event store.

---

## Sharpino.Sample.8: Transport Tycoon Domain
- **Purpose:** Implements the Transport Tycoon scenario (vehicles, routes, hubs) as an event-sourced domain.
- **Key Feature:** Focuses on clean domain logic using aggregate snapshots, command execution, and handling state transitions functionally.

---

## Sharpino.Sample.9: Decision Boundaries & Soft Delete
- **Purpose:** Demonstrates cross-aggregate constraints and conditional soft delete.
- **Key Features:**
  - Employs `runThreeAggregateCommandsMdAsync2` passing a cross-aggregate constraint lambda to lock external streams.
  - Implements soft delete with a predicate ensuring that an aggregate can only be deleted if the number of references to it in other aggregates is zero.

---

## Sharpino.Sample.19: Distributed Caching with FusionCache
- **Purpose:** Scales the application cache horizontally.
- **Key Features:**
  - Integrated with `ZiggyCreatures.FusionCache`.
  - Configures an Azure SQL Server as a shared Level 2 (L2) distributed cache.
  - Utilizes Azure Message Bus to propagate invalidation messages.

---

## Sharpino.Sample.27: L2 Cache with LISTEN/NOTIFY
- **Purpose:** Scaled caching using only PostgreSQL.
- **Key Features:**
  - Uses PostgreSQL as the L2 cache backplane.
  - Broadcasts eviction and synchronization notifications between L1 and L2 caches using PostgreSQL `LISTEN` and `NOTIFY` commands.

---

## Tested Deployment: Serverless Dual-Mode Architecture
- **Purpose:** Demonstrates a tested enterprise deployment utilizing Blazor WebAssembly, Azure Functions, and Sharpino.
- **Key Features:**
  - **Optional Configuration:** Seamlessly toggles between monolithic in-process services and distributed Azure Functions (.NET 10 Isolated Worker) as advanced auto-scaling controllers.
  - **WebAssembly & JWT Authentication:** The client accesses the controller over REST, using JWT bearer tokens for authentication instead of sessions when deployed on Azure Functions.
  - **Multi-Node State Coherence:** Distributed synchronization using PostgreSQL L2 caching and separate read/write database connections.
  - See the full architectural overview in [Serverless Dual-Mode Architecture](/samples/serverless-azure-functions/).
