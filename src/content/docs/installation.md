---
title: Installation & Setup
description: How to install and set up Sharpino in your F# project.
---

# Installation & Setup

## Prerequisites

Before starting, ensure you have:
- [.NET SDK](https://dotnet.microsoft.com/download) (supports .NET 8.0, 9.0, and 10.0+)
- [PostgreSQL](https://www.postgresql.org/) database (for persistent event store)
- [dbmate](https://github.com/amacneil/dbmate) (optional, but highly recommended for migration management)

## Installing the NuGet Package

Add the NuGet package `Sharpino` to your project:

```bash
dotnet add package Sharpino
```

:::note
If you encounter compilation errors like `"A function labeled with the 'EntryPointAttribute' attribute must be the last declaration"`, you can fix it by adding the following line to your `.fsproj` file:
```xml
<GenerateProgramFile>false</GenerateProgramFile>
```
:::

## Project Template Installation

You can bootstrap a project quickly using the official dotnet templates:

```bash
# Install the templates
dotnet new install Sharpino.Templates

# Create a new project
dotnet new sharpino
```

This sets up a minimal project template including a docker-compose configuration for PostgreSQL.

## Database Configuration

1. **dbmate templates:** Sharpino samples use `dbmate` templates to configure PostgreSQL tables for event and snapshot storage.
2. **Environment Variables:** Set up a `.env` file in your project root containing the database connection URL:
   ```ini
   DATABASE_URL=postgres://username:password@localhost:5432/db_name?sslmode=disable
   ```
3. **Run Migrations:** Run the migration tool:
   ```bash
   dbmate up
   ```
Note that the template already contains a Docker-ready PostgreSQL database, so you can simply run:
```bash
docker-compose up -d
dbmate up
dotnet run
```

## Running Tests

If you clone the entire project from GitHub, you will need to configure a `.env` file for each project.

Once the database and environment variables are configured, you can run all tests for a specific sample folder (e.g., `Sharpino.Sample.12`) using:


```bash
runTests.sh
```

To run a single project, navigate to its test folder, configure the `.env` file, and execute:

```bash
dotnet test
```

### RabbitMQ Integration (Optional)
Some examples support RabbitMQ integration. Make sure RabbitMQ is running (e.g., via `rabbitmq-server`), then run the project with:

```bash
dotnet run --configuration:rabbitmq
```

---

## Online Interactive Playground (StackBlitz)

You can run and test a memory-storage-based version of the Sharpino template directly in your browser without any local database setup:

- **StackBlitz Demo:** [Run sharpinoTemplateMem in StackBlitz](https://stackblitz.com/github/tonyx/sharpinoTemplateMem)
- **Source Repository:** [tonyx/sharpinoTemplateMem](https://github.com/tonyx/sharpinoTemplateMem)
