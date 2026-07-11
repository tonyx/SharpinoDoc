---
title: Introduction
description: What is Sharpino and Event Sourcing?
---

# Sharpino

Sharpino is a lightweight event-sourcing library for F# designed to support scalable, consistent, and domain-driven backend development in .NET.

## What is Event Sourcing?

- **State Persistence via History:** Event sourcing is a design pattern for persisting the state of an object by storing the sequence of events that have occurred on the object.
- **Functional Alignment:** It fits the functional paradigm perfectly, as state is computed via a pure `evolve` function: `state = evolve(initialState, events)`.

## Main Features

Sharpino is based on the following core principles:

- **PostgreSQL-Based Event Store:** Robust persistence to register events and snapshots.
- **In-Memory Store:** Fast in-memory event store to optimize test suites.
- **Event ID Optimistic Locking:** Verifies the first available event ID position based on the event ID provided by the command handler to prevent concurrency conflicts.
- **Multiple Stream Transactions:** Executing multiple commands involving different aggregates as single database transactions.
- **StateViewers:** Queries the in-memory cache and falls back to the event store to replay events starting from the latest snapshot if there is a cache miss.
- **Soft Deletion & History:** Mark aggregates as deleted while keeping the historical record accessible.
- **GDPR Compliance:** Supports overwriting, clearing, or resetting snapshots and events in case a user requests data deletion.
- **Message Broker Integration:** Seamlessly fire messages (like InitialState, Events, Deletion) to RabbitMQ or other message buses after events are safely stored.
- **State-based Dynamic Consistency Boundaries:** Encapsulates business logic consistency rules using lambda functions that evaluate extended conditions, extending optimistic locking using related EventIds.

## Library Goals

1. **Idiomatic F#:** Domain modeling and event sourcing in backend architectures using the power of F# types (Discriminated Unions, Records).
2. **Multi-language Integration:** Designed to plug easily into multi-language systems (e.g., Blazor/C# on the frontend and F# on the backend).
3. **No Impedance Mismatch:** Avoid object-relational mapping (ORM) complexity. Domain objects do not need database column-mapping knowledge.

---

<div align="center">
  <a href="https://www.buymeacoffee.com/Now7pmK92m" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 50px !important; width: 180px !important;" />
  </a>
</div>
