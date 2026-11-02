---
title: "Tested Deployment: Serverless Dual-Mode"
description: Tested architecture utilizing Blazor WebAssembly and an optional configuration deploying Azure Functions as advanced controllers with JWT authentication.
---

# Tested Deployment: Serverless Dual-Mode Architecture

A production-tested reference architecture demonstrates an optional configuration where **Azure Functions (.NET 10 Isolated Worker)** serve as advanced, auto-scaling controllers for **Sharpino**, paired with a **Blazor WebAssembly** client.

This tested deployment provides:
- **Dual-Mode Deployment:** Seamlessly switching between a classic in-process monolith and a serverless Azure Functions controller tier via simple configuration.
- **Blazor WebAssembly Frontend:** Accessing controller abstractions via HTTP REST with business logic strictly encapsulated on the server.
- **Stateless JWT Security:** Bridging ASP.NET Core Identity session cookies with Azure Functions bearer tokens and silent auto-refresh.
- **Hardware Daemon Agnosticism:** Powering background services and local client daemons through uniform endpoints.
- **Multi-Tier Distributed Caching:** Synchronizing state across serverless nodes using PostgreSQL `LISTEN`/`NOTIFY`.

---

## 1. Dual-Mode Deployment Architecture

The application can toggle between a classic single-process deployment and an auto-scaling serverless topology via a single configuration key (`Backend:Type`):

```mermaid
flowchart TD
    Config["Configuration: Backend:Type"] -->|Monolithic or Unset| Classic["Classic Mode"]
    Config -->|AzureFunctions| Serverless["Azure Functions Mode"]

    subgraph ClassicMode ["Classic Mode (In-Process)"]
        WebApp1["ASP.NET Core Web App"]
        LocalServices["In-Process Domain Services (Sharpino EventStore)"]
        WebApp1 --> LocalServices
    end

    subgraph ServerlessMode ["Azure Functions Mode (Distributed)"]
        WebApp2["ASP.NET Core Web App"]
        HttpClients["Typed HTTP Clients with ServerJwtDelegatingHandler"]
        AzureFuncs["Azure Functions Backend (.NET 10 Isolated)"]
        WebApp2 --> HttpClients -->|REST + JWT| AzureFuncs
    end

    Classic --> SharedDB[(PostgreSQL EventStore & L2 Cache)]
    Serverless --> SharedDB
```

### Configuration Mechanics

In `Program.cs`, service registration adapts dynamically:

```csharp
var backendType = builder.Configuration["Backend:Type"];

if (string.Equals(backendType, "AzureFunctions", StringComparison.OrdinalIgnoreCase))
{
    // Register HTTP client proxies forwarding domain commands to Azure Functions
    builder.Services.AddHttpClient<IDomainService, ClientDomainService>(client =>
    {
        client.BaseAddress = new Uri(builder.Configuration["Backend:ApiBaseUrl"]!);
    }).AddHttpMessageHandler<ServerJwtDelegatingHandler>();
}
else
{
    // Register in-process Sharpino domain services
    builder.Services.AddScoped<IDomainService, DomainService>();
}
```

---

## 2. Authentication: Session Cookies vs. JWT Bearer Tokens

The only significant operational distinction between monolithic and Azure Functions controller deployments is the **authentication model**:

* **Monolithic Controllers:** Utilize ambient ASP.NET Core Identity cookies (`.AspNetCore.Identity.Application`) scoped to the web host process.
* **Azure Functions Controllers:** Run in a serverless, decoupled environment, relying on stateless **HMAC-SHA256 JWT Bearer Tokens**:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant WebApp as ASP.NET Core Host
    participant WASM as Blazor WebAssembly
    participant Funcs as Azure Functions Backend

    Note over User,WebApp: 1. Standard Identity Login
    User->>WebApp: POST /Account/Login
    WebApp-->>User: Set-Cookie: .AspNetCore.Identity.Application (HttpOnly)

    Note over WASM,Funcs: 2. Token Acquisition & API Dispatch
    WASM->>WASM: Check LocalStorageTokenStorage ("auth_jwt_token")
    alt Token Missing or Expired
        WASM->>WebApp: GET /api/auth/session-token (Includes Cookie)
        WebApp->>WebApp: JwtTokenService.GenerateAccessToken(User)
        WebApp-->>WASM: 200 OK { token: "eyJhbGciOi..." }
        WASM->>WASM: Store in localStorage
    end

    WASM->>Funcs: POST /api/domain/commands [Authorization: Bearer <token>]
    Funcs->>Funcs: Validate HMAC-SHA256 Token & Claims (sub, roles)
    Funcs-->>WASM: 200 OK (Domain Result)

    Note over WASM,Funcs: 3. Self-Healing Silent Refresh
    opt Token Expires during session (401 Unauthorized)
        Funcs-->>WASM: 401 Unauthorized
        WASM->>WASM: Clear invalid token from storage
        WASM->>WebApp: GET /api/auth/session-token (Silent exchange)
        WebApp-->>WASM: 200 OK { token: "<new_token>" }
        WASM->>Funcs: Retry request with new token
        Funcs-->>WASM: 200 OK
    end
```

### Key Security Benefits:
- **No Long-Lived Refresh Tokens in Browser:** Trust is anchored exclusively in the `HttpOnly`, `Secure` Identity cookie.
- **Short Lifetime:** Access tokens live for 60 minutes, limiting vulnerability windows.
- **Silent Healing:** Transient 401 errors trigger automatic re-exchange transparently to the user without interrupting the session.

---

## 3. Multi-Tier Distributed Caching

In distributed serverless environments with dynamic scaling, Sharpino synchronizes aggregate states across all nodes:

1. **L1 Memory Cache:** Managed by `AggregateCache3.Instance` on each function worker, yielding sub-microsecond in-memory reads.
2. **L2 PostgreSQL Cache Table (`sharpino_l2_cache`):** Fast hydration of aggregate snapshots on cold function startups without full event replay.
3. **Cluster Invalidation (`PgNotifyBackplane`):** Any write transaction automatically broadcasts an eviction signal via PostgreSQL `LISTEN`/`NOTIFY`, ensuring stale in-memory snapshots are instantly invalidated across all serverless instances.

