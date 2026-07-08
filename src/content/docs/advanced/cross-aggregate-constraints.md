---
title: Extending the Decision Boundary
description: How to enforce consistency rules across multiple aggregate streams using cross-aggregate constraints.
---

# Extending the Decision Boundary

In Event Sourcing, transactions are typically scoped to a single aggregate stream. However, real-world business rules often require enforcing consistency invariants that span multiple aggregates (cross-aggregate constraints).

Sharpino 6.1.0 introduces the **decision boundary extension** feature, allowing you to enforce consistency involving external streams under the same optimistic lock transaction.

- **Paper (Zenodo):** [Dynamic Consistency Boundaries in Event Sourcing via Multi-Stream Optimistic Concurrency Control](https://zenodo.org/records/21175352)

---

## The Concept

Traditionally, when you execute a command, the optimistic lock checks the event ID (version) only for the target aggregate stream.

With the extended decision boundary:
1. You provide a **cross-aggregates constraint lambda** along with the command.
2. The lambda retrieves the current state of other relevant aggregates, evaluates the business rule, and returns their event IDs (versions).
3. The CommandHandler forwards these external versions to the event store.
4. The database transaction stores the new events only if **both** the target aggregate version and all external aggregate versions match.

This prevents race conditions where the state of a referenced external aggregate is changed during command execution.

---

## Example: Enrolling with Mutual Constraints

Consider a school scheduling system. A business rule states:
> *"Teacher John can teach Math only if student Jack is enrolled in Math and not enrolled in Literature."*

Although the command only targets the **Course** or **Teacher** aggregates directly, the decision depends on **Student Jack's** enrollment state.

Here is how you specify the cross-aggregates constraint in F#:

```fsharp
let crossAggregatesConstraint =
    fun () ->
        result {
            // 1. Retrieve current version and state of Jack
            let! (jackEvId, jack) = studentViewer jack.Id
            
            // 2. Define the external stream lock version targets
            let extraStreamsLocks =
                [((jack.Id, Student.Version + Student.StorageName), jackEvId)] 
                |> Map.ofList

            // 3. Evaluate the business rule constraint
            let! constraintToBeMet =
                (not (jack.Courses |> List.exists (fun c -> c = literature.Id)
                      && (jack.Courses |> List.exists (fun c -> c = math.Id)))
                )
                |> Result.ofBool "Constraint not met: Jack enrolled in Math and Literature"
                
            return extraStreamsLocks
        }
```

When you call command handler functions like `runAggregateCommandMd2` (or its equivalents), pass this lambda. The transaction will check the version of the student stream and fail if another process has updated Jack's enrollments concurrently.

---

## Technical Setup

Extended decision boundaries require PostgreSQL functions that support locking multiple streams.
You must ensure the following are loaded in your database:
- `checkLastEventId` function
- Version 2 of the insertion function for each aggregate stream: `insert_md{Version}{AggregateStorageName}_aggregate_event_and_return_id_opt_lock2`
