---
title: Aggregates
description: Aggregates in Sharpino.
---

# Aggregates

An aggregate is an object that has a unique identifier (`Guid`). It represents your domain models (e.g., `Student`, `Course`).
An aggregate is associated with a stream of events representing its changes over time. This stream of events is immutable (except for some special treatment related to GDPR functions which may update events or snapshots accordingly).


#### Specification of an aggregate:
- **Unique Id:** `Guid`. An aggregate needs to expose an `Id` field representing its unique Identity. Note that the need to overcome "primitive obsession" suggests not using the ID directly as a field of the object, but rather using a wrapper DU.
Extensive example of this approach: 

```fsharp
    type StudentId =
        private
        | StudentId of Guid
        with
            static member New = StudentId (Guid.NewGuid())
            member this.Value = match this with StudentId id -> id
```
Using this approach, the `Student` object needs to expose its ID as follows:
```fsharp
    ...
    member this.Id = this.StudentId.Value
    ...
```
- **Transformational Members**:
Any transformational member of aggregate `'A` returns a `Result<'A, string>`. This makes the member immediately associable with a processable `Event` (as defined in its section). In the example below, there is extensive use of a specific computation expression from the `FsToolkit.ErrorHandling` package, implementing the Railway Oriented Programming pattern:

```fsharp
        member this.Enroll (courseId: CourseId) =
            result
                {
                    do!
                        this.Courses
                        |> List.contains courseId
                        |> not
                        |> Result.ofBool "Already enrolled"
                    do! 
                        this.Courses
                        |> List.length < this.MaxNumberOfCourses
                        |> Result.ofBool "Maximum number of courses reached"
                    return    
                        {
                            this
                                with
                                    Courses = this.Courses @ [courseId]
                        }
                }
```

- **No interface/base class for the aggregate**:
Instead of assuming the presence of an interface or base class, components that need specific information from an aggregate check for these members using _type constraints_. Therefore, you do _not_ need to implement any interface or base class for your aggregates. In addition to the `Id` field, the framework requires the aggregate to expose other members as shown in the following definition:

```fsharp
    static member Version = "_01"
    static member StorageName = "_student"
    member this.Id = this.StudentId.Value 
    static member Deserialize(x: string) =
        try
            JsonSerializer.Deserialize<Student> (x, jsonOptions) |> Ok
        with
        | ex ->
            Error (ex.Message)
            
    member this.Serialize =
        JsonSerializer.Serialize (this, jsonOptions)
```


The framework uses `Version` to identify the version of the aggregate. The `StorageName` identifies the logical aggregate name. By combining the `Version` and `StorageName`, the framework obtains the `streamName`. The `Id` represents the unique ID (`Guid`) of the aggregate, while the `Deserialize` and `Serialize` members are used to deserialize and serialize the aggregate.

The `streamName` determines the names of several database tables and PostgreSQL functions. Considering the Version and the StorageName above, the streamName is `_01_student`. The tables are the following in this case:

- `snapshots_01_student`
- `events_01_student`
- `aggregate_events_01_student`

Some generic bash based scripts are available to create those tables. They are available in the `SqlTemplates` folder of the project. Rather than using these scripts, it is often simpler to copy the SQL tables from the examples and substitute the names (e.g., replacing `student` with your aggregate's name).

**A more detailed explanation of the script generation using dbmate**:
- `dbmate new createStudent` will create the empty student sql setup
- by a copy and paste you insert the sql script from any example and then substitute only the aggregate name reference (e.g., `_01_previousName` becomes `_01_student`).
- Regarding the `Id`: if you decide to use the `StudentId` wrapper for type safety, it is important that its field name is not simply `Id`. `Id` is a contract that must expose the actual Guid (which explains the `Value` property in the example above).

**Serialization and Deserialization**:
In the above example the serialization is string based, where the string contains an actual Json. This explains the signature
`static member Deserialize(x: string)`.
Alternative would be:
`static member Deserialize(x: byte[])` 

The above example uses the `System.Text.Json` namespace for serialization and deserialization. It relies on particular options that make it able to handle specific F# types like D.U.:
```fsharp
    let jsonOptions =
        JsonFSharpOptions.Default()
            .ToJsonSerializerOptions()
```
This is based on the presence of the package FSharp.SystemTextJson.
There is also the possibility to use the package FsPickler (also included in the library).
Note: support for F# types in built-in .NET serialization is improving, which may eventually make `FSharp.SystemTextJson` unnecessary.

In the upcast section you will see a deserialization strategy that faces the "aggregate refactoring"/upgrade issue. 

As a preview of that chapter, note that adding a new field to the `Student` object will cause deserialization of older states to fail. Therefore, you must create a temporary object to deserialize the old structure before upcasting it.

This means you would define an object named `Student001` containing the previous definition of `Student`, using it as a fallback deserialization target before performing the upcast:
```fsharp
    static member Deserialize(x: string) =
        try
            JsonSerializer.Deserialize<Student> (x, jsonOptions) |> Ok
        with
        | ex ->
            try
                let student001 = JsonSerializer.Deserialize<Student001> (x, jsonOptions) |> Ok
                student001.Upcast() |> Ok
            with
            | ex' ->
                Error (ex.Message + "\r\n" + ex'.Message)
```

In the EventStore section we will see how to upcast all the historical existing snapshots which means a massive upcast and replace procedure.

**Recap**:
An aggregate is a special type of object associated with a stream of events and specific database functions. The state of any aggregate is a function of the initial state and the sequence of events stored since then. However, this does not mean the library has to process all events from the beginning to reconstruct the current state. It retrieves the state from a cache that is kept up to date. If the cache is empty (e.g., due to a restart or expiration), the library loads the latest snapshot and processes only subsequent events. This differs from traditional event sourcing, where events are typically emitted and stored atomically in relation to a single stream, potentially leading to temporary inconsistencies between aggregates that require compensating events to resolve.
This concept is usually called _eventual consistency_. 
Under the "extended decision boundary" model (see cross-aggregate constraints), we resolve this issue by allowing coordination between aggregates to happen within the same database transaction. Consequently, events can be emitted across multiple streams transactionally in a single operation.

 
