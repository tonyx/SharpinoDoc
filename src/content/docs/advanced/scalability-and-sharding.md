---
title: Scalability, Sharding & Serverless
description: Horizontal scaling in Sharpino using Read/Write DB separation, multi-tenant sharding, and Azure Functions serverless controllers with WebAssembly.
---

# Scalability, Sharding & Serverless Architecture

As event-sourced systems scale from single-server prototypes to high-throughput multi-tenant platforms, both compute and persistence layers must scale independently.

Sharpino addresses horizontal scaling at three architectural tiers:
1. **Physical Read/Write DB Separation:** Decoupling transactional event append from query and snapshot hydration via primary and read-replica databases.
2. **Database Sharding:** (future feature) Horizontally partitioning event streams across separate database instances using tenant-based routing functions.
3. **Serverless Controllers & WebAssembly:** Decoupling compute using Blazor WebAssembly on the client and auto-scaling Azure Functions as advanced controllers secured with JWT authentication.

---

## 1. Physical Read/Write Database Separation

Starting with Sharpino v6.2.6+, the PostgreSQL storage engine (`PgStorage.fs`) supports distinct read and write connection strings:

```mermaid
flowchart LR
    subgraph Compute Tier ["Application / Azure Functions"]
        CmdHandler["CommandHandler<br/>(Mutations)"]
        StateReader["StateView / Snapshot Queries<br/>(Reads)"]
    end

    subgraph Database Tier ["PostgreSQL Topology"]
        PrimaryDB[("Primary Database<br/>writeConnection<br/>(Append Events, Commit Snapshots)")]
        ReplicaDB[("Read Replica Database<br/>readConnection<br/>(Stream Replay, Hydration)")]
    end

    CmdHandler -->|Transactions & Appends| PrimaryDB
    PrimaryDB -.->|Replication Stream| ReplicaDB
    StateReader -->|Read Snapshots & Events| ReplicaDB
```

### Configuration and Operation

In your application configuration (`.env` or `appsettings.json`):

```ini
# Primary database for mutations
DATABASE_URL=postgres://app_writer:pass@primary-db:5432/events_db?sslmode=disable

# Read replica for queries and state hydration
DATABASE_READ_URL=postgres://app_reader:pass@replica-db:5432/events_db?sslmode=disable
```

* **Write Operations (`writeConnection`):** `CommandHandler.runCommand`, `runDelete`, and snapshot commits use the primary database, guaranteeing ACID compliance and optimistic concurrency locking.
* **Read Operations (`readConnection`):** `StateView.getAggregateFreshState`, `getEvents`, and snapshot queries target read replicas, offloading heavy query and event replay workloads from the primary writer.
* **Fallback:** If `DATABASE_READ_URL` is omitted, both operations seamlessly default to `DATABASE_URL`.

---

## 2. Horizontal Database Sharding

:::note[Roadmap: Planned Future Extension]
Horizontal database sharding—such as routing event streams to specific database shards using a tenant mapping function—is planned as a future extension in upcoming releases of Sharpino. The architecture is already naturally positioned for this extension due to strict aggregate stream isolation.
:::

While read replicas solve read-heavy scalability, write-heavy platforms benefit from **Database Sharding**.

```mermaid
flowchart TD
    Client["Client Request (Tenant Context)"]
    Router["Shard Router<br/>resolveShard(tenantId)"]

    subgraph Shards ["Independent Database Shards"]
        Shard0[("Shard 0 (DB Instance 1)<br/>Tenants [0, 3, 6...]<br/>EventStore + L2 Cache")]
        Shard1[("Shard 1 (DB Instance 2)<br/>Tenants [1, 4, 7...]<br/>EventStore + L2 Cache")]
        Shard2[("Shard 2 (DB Instance 3)<br/>Tenants [2, 5, 8...]<br/>EventStore + L2 Cache")]
    end

    Client --> Router
    Router -->|"hash(tenantId) % 3 = 0"| Shard0
    Router -->|"hash(tenantId) % 3 = 1"| Shard1
    Router -->|"hash(tenantId) % 3 = 2"| Shard2
```

### Why Event Sourcing is Naturally Suited to Sharding

In traditional relational schemas, sharding is notoriously difficult because foreign keys, cross-table joins, and database-level constraints span multiple entities.

In Sharpino:
1. **Isolated Stream Boundaries:** Aggregates and event streams are inherently scoped to an ID. In multi-tenant systems (e.g. multi-vendor retail, tenant workspaces, hospitality), business invariants **never cross tenant boundaries**.
2. **Zero Cross-Shard Distributed Transactions:** Because a command affects only aggregates within a single tenant boundary, every transaction completes locally within its target shard without two-phase commit (2PC) overhead.
3. **Independent Invalidation Channels:** PostgreSQL `LISTEN` and `NOTIFY` backplanes run independently per shard, eliminating cross-tenant cache invalidation traffic.

### Future Sharding Mechanism: Tenant-to-Shard Mapping Function

In the upcoming sharding extension, requests can be routed deterministically to a shard using a tenant mapping function:

```fsharp
type ShardConfig = {
    WriteConnection: string
    ReadConnection: string
}

module ShardRouter =
    /// Deterministically map a tenantId to a specific shard
    let getShard (tenantId: System.Guid) (shards: ShardConfig array) : ShardConfig =
        let hash = abs (tenantId.GetHashCode())
        let index = hash % shards.Length
        shards.[index]

    /// Dynamically create an EventStore instance for the tenant's shard
    let getTenantEventStore (tenantId: System.Guid) (shards: ShardConfig array) : IEventStore =
        let shard = getShard tenantId shards
        PgStorage.createEventStore shard.WriteConnection shard.ReadConnection
```

---

## 3. Serverless Compute: Azure Functions as Advanced Controllers

For high-scale cloud deployments, a tested architecture option allows the API and controller layer to be deployed as **Azure Functions (.NET Isolated Worker Model)** rather than standard in-process controllers.

```mermaid
flowchart TD
    subgraph Browser ["Client Layer (Blazor WebAssembly)"]
        WASM["Blazor WASM App"]
        TokenStore["LocalStorage Token Storage<br/>('auth_jwt_token')"]
    end

    subgraph Host ["Web App Host / Identity Issuer"]
        IdentityCookie["ASP.NET Identity Cookie<br/>(HttpOnly Anchor)"]
        TokenEndpoint["/api/auth/session-token<br/>(JwtTokenService)"]
    end

    subgraph ServerlessBackend ["Serverless Controllers (Azure Functions)"]
        JwtMiddleware["JwtAuthenticationMiddleware"]
        FuncControllers["Function HTTP Triggers<br/>(Domain Services: Orders, Billing, Catalogs)"]
        SharpinoEngine["Sharpino CommandHandler & L1 Cache"]
    end

    subgraph Persistence ["PostgreSQL EventStore & L2"]
        PgStore[("PostgreSQL Database<br/>Events + Snapshots + L2 Cache")]
        Backplane["PgNotifyBackplane<br/>(LISTEN / NOTIFY)"]
    end

    WASM -->|1. Exchange Cookie for JWT| TokenEndpoint
    IdentityCookie -.-> TokenEndpoint
    TokenEndpoint -->|2. Mint 60-min JWT| TokenStore
    TokenStore -->|3. REST + Bearer JWT| JwtMiddleware
    JwtMiddleware --> FuncControllers
    FuncControllers --> SharpinoEngine
    SharpinoEngine --> PgStore
    PgStore -.-> Backplane
    Backplane -.-> SharpinoEngine
```

### WebAssembly Client Accessing Controllers

In this architecture:
* The user interface is implemented in **Blazor WebAssembly (WASM)** running directly in the browser.
* The WebAssembly client accesses the controller layer via HTTP REST endpoints.
* The application can be configured so that the controller layer is either an in-process ASP.NET Core controller or deployed as **Azure Functions**, without changing the client-facing contracts.

### Controller Implementation: Monolith vs. Azure Functions

A tested deployment is based on this optional dual-mode configuration (`Backend:Type`):

| Characteristic | Classic Monolithic Controller | Azure Functions Controller |
| :--- | :--- | :--- |
| **Execution** | In-process with ASP.NET Core Web App | Independent serverless worker instances (.NET 10 Isolated) |
| **Scalability** | Vertical or cluster-level web host scaling | Auto-scales dynamically on event bursts (e.g. peak hours) |
| **Domain Services** | Injected directly in DI container | Registered as typed HTTP proxies (`ClientDomainService`) forwarding to Functions |
| **Compute Cost** | Continuous hosting charges | Pay-per-execution serverless billing |

### Authentication: Session Cookies vs. JWT Bearer Tokens

The only significant difference between the two deployment modes is in **authentication**:
* In the monolithic configuration, the controller utilizes traditional **cookie-based session authentication** (`.AspNetCore.Identity.Application`).
* When the controller is implemented as **Azure Functions**, it uses stateless **JWT tokens** for authentication instead of sessions.

The token lifecycle works seamlessly:
1. **Trust Anchor:** The user logs in to the web host, receiving an `HttpOnly`, `Secure` Identity cookie.
2. **Token Exchange:** The Blazor WASM client queries `/api/auth/session-token`. The host verifies the session cookie and mints a short-lived (60-minute) `HMAC-SHA256` JWT bearer token containing user claims (`sub`, `roles`).
3. **Bearer Authorization:** WASM requests attach the token via `Authorization: Bearer <token>`.
4. **Self-Healing Silent Refresh:** If an Azure Function returns `401 Unauthorized` due to token expiration, the client interceptor clears the expired token, silently requests a fresh token from `/api/auth/session-token` using the underlying session cookie, and retries the command transparently without user disruption.

---

## 4. Multi-Tier Distributed Cache Synchronization

When running multiple Azure Function instances and web nodes, memory coherence is maintained through Sharpino's multi-tier caching architecture:

1. **L1 In-Memory Cache (`AggregateCache3`):** Sub-microsecond local reads using boxed objects (`BoxedState`), bypassing deserialization.
2. **L2 Distributed Cache (`sharpino_l2_cache`):** PostgreSQL distributed cache table storing serializable snapshots (`CachedAggregateEntry`) for rapid hydration on cold worker startups.
3. **Backplane Invalidation (`PgNotifyBackplane`):** Whenever an instance commits an event, it issues a PostgreSQL `NOTIFY sharpino_cache_eviction`. All active Azure Function instances receive the signal and evict the outdated aggregate from their local L1 memory, ensuring immediate cluster-wide consistency.

