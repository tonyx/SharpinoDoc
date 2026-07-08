---
title: FAQ & Trivia
description: Frequently asked questions and miscellaneous details.
---

# FAQ & Trivia

## Why the name "Sharpino"?
It is a portmanteau of the character **"Sharp"** (as in C# or F#) and **"fino"** (the Italian word for *thin* or *fine*). Pronounced *sciarpino*, it also means "little scarf" in Italian.

---

## Why another F# Event Sourcing library?
The author created it to study Event Sourcing and use it in real-world personal and commercial projects. Functional programming languages (especially the ML family) are a natural fit for Event Sourcing because:
1. **Immutable Events:** Events represent facts, which are immutable by nature.
2. **Pure State Computation:** Computing current state is simply a fold function over events.
3. **Discriminated Unions:** Standard DUs provide a perfect representation for both commands and events.
4. **.NET Ecosystem Integration:** Access to libraries like FsPickler, Dapper, and various cache/message bus drivers.

---

## How does Sharpino compare to Equinox?
Equinox is a well-established .NET event-sourcing framework. Sharpino differs in its specific lightweight design choices and direct support for features like:
- Simpler cross-stream transaction helpers.
- Built-in `Refreshable` in-memory composite Detail caching.
- Native SQL/Postgres integrations without complex setup.

You can inspect the following side-by-side comparison repositories:
- [Counter in Sharpino](https://github.com/tonyx/SharpinoCounter3) vs. [Counter in Equinox](https://github.com/jet/equinox/blob/master/samples/Tutorial/Counter.fsx)
- [Invoices in Sharpino](https://github.com/tonyx/sharpinoinvoices) vs. [Invoices in Equinox](https://github.com/nordfjord/minimal-equinox/tree/main)

---

## Is there a full-stack template?
Yes:
- [Sharpino.Blazor.Template](https://github.com/tonyx/sharpinoBlazor) shows a full-stack walking skeleton utilizing a Blazor C# frontend communicating with a Sharpino F# backend.