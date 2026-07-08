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

> [!NOTE]
> If you encounter compilation errors like `"A function labeled with the 'EntryPointAttribute' attribute must be the last declaration"`, you can fix it by adding the following line to your `.fsproj` file:
> ```xml
> <GenerateProgramFile>false</GenerateProgramFile>
> ```

## Project Template Installation

You can bootstrap a project quickly using the official dotnet templates:

```bash
# Install the templates
dotnet new install Sharpino.Templates

# Create a new project
dotnet new sharpino
```

This sets up a minimal project template including a docker-compose configuration for Postgres.

## Database Configuration

1. **dbmate templates:** Sharpino samples use `dbmate` templates to configure Postgres tables for event and snapshot storage.
2. **Environment Variables:** Set up a `.env` file in your project root containing the database connection URL:
   ```ini
   DATABASE_URL=postgres://username:password@localhost:5432/db_name?sslmode=disable
   ```
3. **Run Migrations:** Run the migration tool:
   ```bash
   dbmate up
   ```

## Running Tests

Once the database and environment variables are ready, you can run all the sample tests via:

```bash
runTests.sh
```

To run a single project, navigate to its test folder, configure the `.env` file, and execute:

```bash
dotnet test
```

### RabbitMQ Integration (Optional)
Some examples support integration with RabbitMQ. Make sure RabbitMQ is running (e.g., `rabbitmq-server`), and run the subproject with:

```bash
dotnet run --configuration:rabbitmq
```
