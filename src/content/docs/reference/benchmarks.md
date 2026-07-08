---
title: "Benchmarks & Performance"
description: Performance comparisons between Sharpino and other databases/libraries.
---

# Benchmarks & Performance

Sharpino is designed with efficiency in mind, optimizing event appending and in-memory caching to guarantee high performance on .NET workloads.

---

## Sharpino vs. UmaDb

A performance test comparing Sharpino against **UmaDb (v0.6.1)** was conducted to evaluate write throughput under sequential event appending.

- **Benchmark Repository:** [tonyx/sharpinoVsUmaDbTest](https://github.com/tonyx/sharpinoVsUmaDbTest)
- **Workload:** 10,000 sequential operations.
- **Environment:** Conducted on an Apple M2 Silicon machine running macOS.

### Execution Results

```txt
Uma.db Append operation (10000 elements) took 86 ms         
Sharpino Add initial states operation (10000 elements) took 30 ms                
Sharpino Massive Subscription of 10000 courses took 31 ms
```

As demonstrated, Sharpino operations took ~30–31 ms, while UmaDb completed similar appends in 86 ms, making Sharpino **between 177% and 187% faster** (nearly 2.8x speedup) than UmaDb.

### Key Factors for Performance

1. **Lightweight Concurrency Control:** Sharpino relies on optimized event ID optimistic concurrency checks at the database query level, avoiding expensive distributed locks.
2. **Task-based Asynchrony:** Rebuilt around native async tasks and thread-pool optimization, minimizing context-switching and maximizing IO utilization.
3. **Optimized L1 Caching:** Bypasses state reconstruction completely on subsequent command executions by keeping state in memory and updating it proactively.
