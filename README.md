# Auth API

A lightweight REST authentication service built for the Lendesk backend assessment — register/login with JWT issuance, backed by Redis and hardened for internal service use.

---

## Prerequisites

- Node 20+
- Docker + Docker Compose (recommended), **or** a local Redis instance

---

## Setup

### With Docker (recommended)

```bash
cp .env.example .env   # set JWT_SECRET to something strong
docker-compose up --build
```

### Without Docker

```bash
cp .env.example .env
# edit REDIS_URL=redis://localhost:6379 in .env
npm install
npm start
```

---

## Running Tests

```bash
# Docker
docker-compose run --rm -e REDIS_URL=redis://redis:6379/1 app npm test

# Local (Redis must be running)
npm test
```

`REDIS_URL` is pinned to `redis://localhost:6379/1` automatically by the test script via `cross-env` — no manual export needed. Tests run against Redis database 1 to isolate from dev data.

---

## Endpoints

| Method | Path | Body | Responses |
|--------|------|------|-----------|
| `POST` | `/api/v1/register` | `{ username, password }` | `200` / `400` / `409` |
| `POST` | `/api/v1/login` | `{ username, password }` | `200 { token }` / `400` / `401` |
| `GET` | `/health` | — | `200 { status: "ok" }` |

### Register

```bash
curl -s -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Secure1!"}' | jq
```

```json
{ "message": "User created" }
```

### Login

```bash
curl -s -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Secure1!"}' | jq
```

```json
{ "token": "<jwt>" }
```

### Validation errors (400)

```bash
curl -s -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"a","password":"weak"}' | jq
```

```json
{
  "errors": [
    { "msg": "Invalid value", "path": "username", "...": "..." },
    { "msg": "Password must contain uppercase, number, and special character", "path": "password", "...": "..." }
  ]
}
```

---

## Design Decisions

- **Express** — minimal surface area, well-understood request/response model; no framework overhead needed for a focused auth service.
- **Redis hashes** — O(1) user lookup by username with `user:<username>` as the key; no secondary index required for this use case.
- **bcrypt saltRounds 12** — ~300ms per hash on modern hardware. Slow enough to frustrate offline brute force, fast enough for an auth endpoint under normal load.
- **JWT 1h expiry, no refresh token** — acceptable tradeoff for an internal service. See Security Notes for what would change in a public-facing deployment.
- **`hsetnx` for registration** — atomic check-and-set prevents a race condition where two concurrent requests with the same username both pass an existence check.
- **`200` on `/register`** — matches the assessment spec; `201` would be more semantically correct for resource creation.

---

## Security Notes

Known limitations documented inline in [`src/services/userService.js`](src/services/userService.js):

- **No account lockout** — the rate limiter (20 requests / 15 min on `/login`) is a partial control. A full lockout mechanism would track failed attempts per username in Redis.
- **JWT revocation** — stateless tokens cannot be invalidated before expiry. The 1h TTL limits exposure; production would add refresh token rotation and a server-side blocklist.
- **Redis unencrypted at rest** — enable Redis `AUTH` and TLS before deploying with real credentials.
- **Username enumeration** — mitigated by running a dummy `bcrypt.compare` on the not-found path, making "user not found" and "wrong password" constant-time (~300ms each).

---

## Approach

I structured this as a layered service: config → service → validator → route → middleware, keeping each layer testable in isolation. The focus was on getting the security fundamentals right (atomic writes, constant-time comparisons, input validation before business logic) rather than adding features.
