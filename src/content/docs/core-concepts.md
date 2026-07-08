---
title: Overview & Architecture
description: Core concepts and project structure of the Sharpino library.
---


This page outlines the core architectural blocks, libraries, and terms within Sharpino.

## Core Terminology

- **Aggregates:** Event-sourced objects that have a unique identifier (`Guid`). They represent your domain models (e.g., `Student`, `Course`).
- **Contexts:** (Deprecated: Use standard aggregates with a constant Id instead) Event-sourced objects with no ID, so only one instance is available per type. They define an initial state using a static `Zero` member.
- **Commands:** Discriminated Unions representing intents to change state. Commands are executed against an aggregate and produce a new state and a list of events.
- **Events:** Discriminated Unions representing facts that have happened. Events are applied to aggregates via the `evolve` function.
- **StateViewer:** A non-pure function that retrieves the current state of an aggregate. It probes the cache first, falling back to the event store to replay events starting from the latest snapshot if there is a cache miss.
- **HistoryStateViewer:** Similar to the StateViewer, but also includes softly deleted aggregates.
- **Soft Delete:** A mechanism to mark an aggregate snapshot as deleted instead of deleting the stream events.
- **Cache:** In-memory caching mechanism using memory caches to store aggregate states.
- **Details (Materialized Views):** Composed views representing data combined from multiple streams (e.g., `StudentDetails`).

---

## Assembly Breakdown

Sharpino is organized into several projects:

### 1. Sharpino.Lib.Core
Contains the core functional signatures:
- **`Core.fs`:** Defines `Events`, `Commands`, and the pure `evolve` functions that define how events advance the state of aggregates and contexts.

### 2. Sharpino.Lib
Handles state management, storage interfaces, and caching:
- **`CommandHandler.fs`:** Coordinates fetching states, applying commands, committing events to the EventStore, updating caches, and firing notifications.
- **`PgEventStore.fs` / `MemoryStorage.fs`:** Postgres and in-memory event stores using text/JSON format.
- **`PgBinaryEventStore.fs`:** Postgres event store using binary serialization (via external libraries like FsPickler).
- **`Cache.fs`:** Houses the L1 cache (`AggregateCache3`) and L2 cache coordinates.
