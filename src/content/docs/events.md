---
title: Events
description: Events in Sharpino.
---

# Events
An Event is an instance of a specific Event Type associated with a specific Aggregate type. The library stores events in the event store, reads them from the event store, and processes them to reconstruct an up-to-date version of the aggregate. 
The most convenient representation is a discriminated union with cases that have a one-to-one correspondence with the transformational members of the aggregate itself. 
Example:
```fsharp
module StudentEvents =
    type StudentEvents =
        | Enrolled of CourseId
        | Unenrolled of CourseId
        interface Event<Student> with
            member this.Process (student: Student) =
                match this with
                | Enrolled id -> student.Enroll id
                | Unenrolled id -> student.Unenroll id
       
        static member Deserialize (x: string) =
            try
                JsonSerializer.Deserialize<StudentEvents> (x, jsonOptions) |> Ok
            with
            | ex ->
                Error (ex.Message)
                
        member this.Serialize =
            JsonSerializer.Serialize (this, jsonOptions)

```
The logic is straightforward.
Given an event and a specific aggregate, processing the event means calling the aggregate member associated with that event—acting as a dispatching mechanism.

The `Serialize` and `Deserialize` members are not defined at the interface level (note the indentation) because they are checked via type constraints rather than interfaces. 

**On the possibility of an event returning an Error instead of Ok**
The `Process` method returns a `Result<'A, string>` and could, in theory, return an `Error`.
However, once an event is stored, it represents a fact that successfully occurred in the past and should not fail when re-applied.
The `CommandHandler` does not attempt to store events that would fail validation, and the `EventStore` uses optimistic locking to prevent storing events that might fail application. If the optimistic lock fails, it is because the version (EventId) of the aggregate has changed since the command was executed. This indicates that the state has evolved, meaning the event could potentially fail if applied.

Briefly, the optimistic lock guarantees that events are stored only if the aggregate's version has not changed since the command was executed. 

Reconstructing the state from a sequence of events starts from an initial state or snapshot and uses the `evolve` function (which wraps a `List.fold`). The library typically runs `evolve` starting from the latest snapshot and replaying subsequent events only if the cache is empty; otherwise, it retrieves the up-to-date state from the cache, which is kept in sync with the event store.

Regarding the last point: if a failing event somehow gets stored anyway, the system's default configuration will fall back to a "failsafe" evolve process and log the error. 
