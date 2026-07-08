---
title: Refreshable Details & Views
description: Caching composite read-model views (Details) using the Refreshable interface.
---

An application usually needs composed views of multiple objects (e.g., combining `Student` and `Course` data). In Sharpino, these composed read models are called **Details**.

Even though details benefit from single-object caching, caching the fully composed Detail view models themselves provides significant performance improvements.

## Problem Context

Consider a `Student` aggregate:

```fsharp
type Student =
    {
        Id: StudentId
        Name: string
        Courses: List<CourseId>
        MaxNumberOfCourses: int
    }
```

To display student details along with their full course objects, we define a composite `StudentDetails` model:

```fsharp
type StudentDetails =
    {
        Student: Student
        Courses: List<Course>
    }
```

Without caching the composed view, retrieving it requires resolving the dependencies every single time:

```fsharp
let getStudentDetails studentId =
    result {
        let! student = this.GetStudent studentId
        let! courses = this.GetCourses student.Courses
        return { Student = student; Courses = courses }
    }
```

To optimize this, we can cache the `StudentDetails` and automatically refresh it only when the student or any associated course is modified.

---

## Implementing `Refreshable`

Every detail view cache candidate must implement the `Refreshable<'T>` interface:

```fsharp
type StudentDetails =
    {
        Student: Student
        Courses: List<Course>
        Refresher: unit -> Result<Student * List<Course>, string>
    }
    
    member this.Refresh () =
        result {
            let! student, courses = this.Refresher ()
            return { this with Student = student; Courses = courses }
        }
   
    interface Refreshable<StudentDetails> with
        member this.Refresh () =
            this.Refresh ()
```

---

## Wiring Up Dependencies

To enable reactive cache invalidations, you must associate the aggregate IDs with the details cache. This is registered using a `DetailsCacheKey` and the `Memoize` function:

```fsharp
member this.GetCourseDetails (id: CourseId) =
    let detailsBuilder =
        fun () ->
            let refresher =
                fun () ->
                    result {
                        let! course = this.GetCourse id
                        let! students = this.GetStudents course.Students
                        return course, students
                    }
            result {
                let! course, students = refresher ()
                return
                    (
                        {
                            Course = course
                            Students = students
                            Refresher = refresher
                        } :> Refreshable<_>
                        ,
                        // Specify the IDs that trigger a refresh when updated
                        id.Id :: (students |> List.map _.Id.Id)
                    )
            }
            
    let key = DetailsCacheKey (typeof<CourseDetails>, id.Id)
    StateView.getRefreshableDetails<CourseDetails> detailsBuilder key
```

The `detailsBuilder` returns a tuple: the `Refreshable` instance and a list of `Guid`s representing dependencies. The `DetailsCache` registers these associations. If any of those IDs are updated, the cache invalidates and triggers `Refresh()`.
