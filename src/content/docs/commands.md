---
title: Commands
description: Commands in Sharpino.
---

# Commands

A _command_ is an object that implements the `AggregateCommand` interface (or the `Command` interface if it relates to a specific kind of aggregate with a single instance and no ID).
Executing a command against a specific state of an aggregate returns a result. If successful (`Ok`), the result contains both the new state and a list of events that, when applied to the input state, produce the new output state.
If applying these events to the input state results in an error, the command execution must fail and return an error instead. Consequently, a command cannot return an `Ok` status alongside events that fail application.
This flow is straightforward since a command typically yields a new state and a single event; the success or failure of the execution can rely directly on the behavior of the aggregate's own domain logic.

An example:
```fsharp
    type StudentCommands =
        | Enroll of CourseId
        | Unenroll of CourseId
        interface AggregateCommand<Student, StudentEvents> with
            member this.Execute (student: Student) =
                match this with
                | Enroll courseId ->
                    student.Enroll courseId
                    |> Result.map (fun s -> ( s, [ Enrolled courseId ]))
                | Unenroll courseId ->
                    student.Unenroll courseId
                    |> Result.map (fun s -> ( s, [ Unenrolled courseId ]))
            member this.Undoer =
                None

```

Under the hood, the system is based on the CQRS principle. The application constructs a command and sends it to the `CommandHandler` component. The handler executes the command, persists the resulting events, and updates the cache with the new state, provided both the execution and event persistence succeed.
Additionally, the handler may publish the events to a message bus or dispatch them through other integration channels.
To prevent race conditions, the event store relies on an optimistic concurrency control mechanism based on the version (event ID or sequence number) of the aggregate.



