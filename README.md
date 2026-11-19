# Shortly — High-Performance URL Shortener

Shortly is a high-throughput, resilient URL shortener built with Spring Boot and PostgreSQL. It delivers sub-millisecond redirects using an in-memory LRU cache and non-blocking asynchronous click analytics.

## Tech Stack

- **Language:** Java 21+ (Java SE 21 / 26)
- **Framework:** Spring Boot 3.3.5 (Spring MVC, Spring Data JPA, Hibernate, Actuator)
- **Database:** PostgreSQL 16
- **Migrations:** Flyway
- **Build Tool:** Maven
- **Documentation:** Springdoc OpenAPI / Swagger UI
- **Frontend:** Responsive HTML5 / CSS3 / Vanilla JavaScript

## Architecture Overview

```
                      +-------------------+
                      |   Client / Web    |
                      +---------+---------+
                                |
             +------------------+------------------+
             |                                     |
    POST /api/links (Shorten)             GET /{code} (Redirect)
             |                                     |
    +--------v--------+                   +--------v--------+
    | LinkController  |                   | RedirectController
    +--------+--------+                   +--------+--------+
             |                                     |
    +--------v--------+            Cache Hit?      |
    |   UrlService    +<===========================+
    +---+----+----+---+     (In-Memory LRU Cache)  |
        |    |    |                                |
Base62  |    |    | Sequence                       | Async (TaskExecutor)
Encoder |    |    | nextId()                       |
        |    |    |                                v
    +---v----+----v---+                   +------------------+
    | PostgreSQL DB   |                   | AnalyticsService |
    |  - short_url    |                   +--------+---------+
    |  - click_event  |                            |
    +-----------------+                            v
                                          +------------------+
                                          |   PostgreSQL     |
                                          |  (click_event)   |
                                          +------------------+
```

## API Contract

| Method | Path | Request Body | Response Status | Response Body |
|---|---|---|---|---|
| `POST` | `/api/links` | `{"url":"...", "alias":"optional", "expiresAt":"optional ISO-8601"}` | `201 Created` | `{"shortCode":"...", "shortUrl":"...", "originalUrl":"...", "expiresAt":"..."}` |
| `GET` | `/{code}` | None | `302 Found` | Header `Location: <originalUrl>` |
| `GET` | `/api/links/{code}/stats` | None | `200 OK` | `{"shortCode":"...", "originalUrl":"...", "totalClicks":N, "clicksPerDay":[...], "devices":[...]}` |
| `GET` | `/swagger-ui.html` | None | `200 OK` | Swagger UI Interactive Documentation |
| `GET` | `/actuator/health` | None | `200 OK` | Health Check Endpoint |

### Error Format
All client/server errors return a structured JSON response:
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Short link not found: abc123",
  "timestamp": "2026-11-19T10:45:00.000Z"
}
```

## How to Run

### Option 1: Docker Compose (Recommended)
```bash
docker compose up --build
```
Access the application at:
- Web UI: http://localhost:8080/
- Swagger API Docs: http://localhost:8080/swagger-ui.html
- Health check: http://localhost:8080/actuator/health

### Option 2: Local Development with Maven
1. Start PostgreSQL (e.g. `docker compose up -d postgres`)
2. Run the application:
```bash
mvn spring-boot:run
```

## Running Tests

Execute all unit and slice tests:
```bash
mvn clean test
```

## Key Design Decisions

1. **Sequential Base62 with Offset:**
   - Database sequences guarantee collision-free global unique IDs without distributed locks or coordination.
   - Adding an offset of $62^5 = 916,132,832$ ensures all generated codes start at 6 alphanumeric characters right from ID #1.
2. **In-Memory Thread-Safe LRU Cache:**
   - Wraps a custom `LinkedHashMap` configured in access-order mode inside `Collections.synchronizedMap` to cache hot links and avoid database hits on frequent redirects.
3. **Decoupled Asynchronous Analytics:**
   - Click tracking is handled in a separate bounded `ThreadPoolTaskExecutor` (`analyticsExecutor`) so redirect latency is never impacted by analytics writes. A custom rejection handler drops click events when overloaded rather than delaying users.
4. **Resilient Validation & Security:**
   - Strict URI parsing allows only `http` and `https` schemes, rejecting dangerous protocols like `javascript:`, `file:`, or `data:`.
   - Reserved keywords (`api`, `swagger-ui`, `actuator`, `v3`) are protected from alias squatting.

## Future Work

- **Distributed Caching:** Introduce Redis with Redis Sentinel/Cluster for multi-node horizontally scaled deployments.
- **Rate Limiting:** Implement sliding-window token bucket rate limiting (e.g., Bucket4j or Redis).
- **Event Streaming:** Stream click logs to Apache Kafka for large-scale real-time aggregation and fraud detection.
- **User Authentication:** Support OAuth2/JWT for user-specific link management, private analytics, and custom domains.
- **Link Safety:** Integrate Google Safe Browsing API or VirusTotal to scan links before shortening.
