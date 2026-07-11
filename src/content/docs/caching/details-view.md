---
title: Refreshable Details & Views
description: Caching composite read-model views (Details) using the Refreshable interface.
---

# Refreshable Details/Views
An application usually needs composed views of multiple objects (e.g., combining `Student` and `Course` data). In Sharpino, these composed read models are called **Details**.

Even though Details already benefit from single-object caching, caching the fully composed Detail view models themselves provides additional performance improvements.

## Problem Context

Consider a `Student` aggregate:

```fsharp
type Student =
    {
        StudentId: StudentId
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
Note: A similar definition exists for asynchronous scenarios (`RefreshableAsync`).

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

Alternative async version (which may be updated in the future to avoid passing the cancellation token twice):
```fsharp
        member this.GetCourseDetailsAsync (id: CourseId) (cancellationToken: Option<CancellationToken>) : Task<Result<CourseDetails, string>> =
            let detailsBuilder =
                fun (ct: option<CancellationToken>) ->
                    let refresher =
                        fun (ct: Option<CancellationToken>) ->
                            taskResult {
                                let! (course: Course) = this.GetCourseAsync id ct
                                let! (students: List<Student>) = this.GetStudentsAsync course.Students ct
                                return course, students
                            }
                    taskResult {
                        let! course, students = refresher ct
                        return
                            (
                                {
                                    Course = course
                                    Students = students
                                    Refresher = refresher
                                } :> RefreshableAsync<_>
                                ,
                                id.Id:: (students |> List.map _.StudentId.Id)
                            )
                    }
            let key = DetailsCacheKey.OfType typeof<CourseDetails> id.Id
            StateView.getRefreshableDetailsTaskResultAsync<CourseDetails> detailsBuilder key cancellationToken
```

The `detailsBuilder` returns a tuple containing the `Refreshable` instance and a list of `Guid` dependencies. The `DetailsCache` registers these associations; if any of those IDs are updated, the cache invalidates the entry and triggers `Refresh()`.
