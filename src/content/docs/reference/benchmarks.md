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
Uma Append operation took 68 ms         
Add operation took 29 ms                
Massive Subscription of 10000 courses took 24 ms
Parallel Uma Append operation (10000 elements) took 504 ms
Parallel Sharpino Add operation (10000 elements) took 763 ms
Parallel tasks (30 tasks of 10000 elements) Uma Append operation took 832 ms
Parallel tasks (30 tasks of 10000 elements) Sharpino Add operation took 9190 ms

```

Sharpino prevails on single-task appends.
Umadb prevails on parallel append tasks.


### Key Factors for Performance

1. **Lightweight Concurrency Control:** Sharpino relies on optimized event ID optimistic concurrency checks at the database query level, avoiding expensive distributed locks.
2. **Task-based Asynchrony:** Rebuilt around native async tasks and thread-pool optimization, minimizing context-switching and maximizing IO utilization.
3. **Optimized L1 Caching:** Bypasses state reconstruction completely on subsequent command executions by keeping state in memory and updating it proactively.
