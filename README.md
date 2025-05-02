# Driver Location Microservice

A **Dockerized** NestJS microservice for real-time driver location tracking in a ride-hailing platform, built with **TypeScript, MongoDB, Redis, and a REST API**. It fulfills **three** tasks:

1. Process `driver_location_log.json` (100 updates, 10 drivers) and publish updates to the API at `time_offset_sec` intervals.
2. Implement a POST `/location` endpoint to ingest driver location updates.
3. Store updates in MongoDB, cache in Redis, provide a GET `/location` endpoint, and support optional historical tracking via GET `/location/history`.

The solution is production-ready, leveraging dependency injection, robust error handling, and TypeScript’s type safety. It is optimized for high-frequency updates (100 updates, \~2 requests/second) and scalable to 10,000–100,000 drivers.

## Features

* **Efficient Storage**: MongoDB with indexed `driver_locations` and `driver_location_history` collections; Redis caches latest locations (\~0.1ms reads).
* **Scalability**: Horizontal scaling, MongoDB sharding, Redis clustering.
* **Error Handling**: Try-catch, global exception filter, and logging.
* **Type Safety**: TypeScript and `class-validator` for robust data validation.
* **Code Quality**: **Prettier** and **ESLint** for consistent, error-free code.
* **Testing**: Jest/Supertest unit tests.

## Tools and Technologies

* **NestJS 11**: TypeScript framework for modular, scalable APIs (\~500–1,000 req/s).
* **MongoDB 8**: Stores latest (~~10 docs) and historical (~~100 docs) locations with atomic `upsert` and TTL index (30 days).
* **Redis 5**: Caches latest locations (\~10 keys) via `REDIS_CLIENT` provider.
* **Docker**: Consistent environments with `docker-compose.yml`.
* **Prettier/ESLint**: Code formatting and linting.
* **Jest/Supertest**: Unit testing.
* **Axios**: Task 1 script for API requests.

## Prerequisites

* **Node.js 18+**: For local dev or tests (optional with Docker).
* **Docker & Docker Compose**: For running services.
  * macOS/Linux: [Docker Desktop](https://www.docker.com/products/docker-desktop/).
  * Windows: Docker Desktop with WSL 2 (preferred) or Git Bash with `awk` (`winget install GnuWin32.Gawk`).

## 🐳 Docker Installation (Windows)

To run this project in a consistent, containerized environment, Docker and Docker Compose are required.

### ✅ Recommended: Docker Desktop

1. **Install WSL 2 (Windows Subsystem for Linux)**
   * Open **PowerShell as Administrator** and run:

     `wsl --install
     `
   * Restart your computer if prompted.
   * Verify installation:

     `wsl --status
     `
2. **Download and Install Docker Desktop**
   * Download: https://www.docker.com/products/docker-desktop/
   * Run the installer and follow the instructions.
   * Ensure **WSL 2 integration** is enabled in Docker settings after installation.
3. **Start Docker and Verify**
   * Docker Desktop should start automatically.
   * Verify installation:

     `docker --version && docker compose version
     `

📝 **Tip**: On Windows, use **Git Bash** or **WSL terminal** instead of `cmd.exe` to run shell scripts like `start.sh`.

## Project Setup

### Docker (Recommended)

1. Clone or unzip the repository.
2. Install dependencies:

   `npm install
   `
3. Start services (Please make sure you use Git Bash instead of CMD if you're using Windows):

   `./start.sh
   `
   * NestJS: `http://localhost:3000`
   * MongoDB: port `27017`
   * Redis: port `6379`
4. Clean up:

   `./start.sh clean
   `

### Without Docker

1. Install Node.js 18+, MongoDB, Redis.
2. Install dependencies:

   `npm install
   `
3. Start MongoDB (`mongod`), Redis (`redis-server`).
4. Set environment variables:

   `export MONGODB_URI=mongodb://localhost:27017/driver_location
   export REDIS_URL=redis://localhost:6379
   export REDIS_CACHE_TTL=3600
   `
5. Run:

   `npm run start:dev
   `

## API Endpoints

* **POST /location**: Ingest location update.

  `curl -X POST http://localhost:3000/location -H "Content-Type: application/json" -d '{"driver_id":"driver_001","latitude":1.342597,"longitude":103.864783}'
  `

  Response: `{ "status": "success" }`
* **GET /location?driver_id=**: Get latest location.

  `curl http://localhost:3000/location?driver_id=driver_001
  `

  Response: `{ "driver_id": "driver_001", "latitude": 1.342597, "longitude": 103.864783, "updated_at": "..." }`
* **GET /location/history?driver_id=&start_time=<time title="&amp;end_time=" datetime="">&end_time=</time>**: Get historical locations (optional).

  `curl "http://localhost:3000/location/history?driver_id=driver_001&start_time=2025-05-01T00:00:00Z&end_time=2025-05-02T00:00:00Z"
  `

  Response: Array of locations.

## Task Implementation and Testing

### Task 1: Process and Publish Driver Location Data

**Achievement**:

* A **TypeScript** script _(src/scripts/publish-location.ts)_ reads **driver_location_log.json** using fs.
* Iterates through 100 updates, sending each to POST /location via **Axios** at time_offset_sec intervals using setTimeout.
* Logs successes and failures, ensuring synchronous, sequential publishing (\~50s total).

**Testing**:

1. Place **driver_location_log.json** in the project root.
2. Start the API:

   `./start.sh`
3. Run the script:

   `npx ts-node src/scripts/publish-location.ts`
4. **Expected Outcome**:
   * Console logs \~100 successful POSTs.
   * Verify data in **MongoDB**:

     `docker exec -it <mongo-container> mongosh
     use driver_location
     db.driver_locations.find()`
   * Check **Redis** cache:

     `docker exec -it <redis-container> redis-cli
     KEYS driver:*`

### Task 2: Driver Location Ingestion Service

**Achievement**:

* POST /location endpoint in LocationController accepts driver_id, latitude, longitude.
* Validates inputs with class-validator in CreateLocationDto.
* LocationService stores updates in **MongoDB** (driver_locations) using atomic upsert to prevent race conditions, caches in **Redis** with REDIS_CLIENT provider (1-hour TTL), and logs to driver_location_history.

**Testing**:

1. Start the API:

   `./start.sh`
2. Send a location update:

   `curl -X POST http://localhost:3000/location -H "Content-Type: application/json" -d '{"driver_id":"driver_001","latitude":1.342597,"longitude":103.864783}'`
3. **Expected Outcome**:
   * Response: { "status": "success" }
   * Verify in **MongoDB**:

     `docker exec -it <mongo-container> mongosh
     use driver_location
     db.driver_locations.findOne({ driver_id: "driver_001" })`
   * Verify in **Redis**:

     `docker exec -it <redis-container> redis-cli
     GET driver:driver_001`

### Task 3: Storage and Query Capabilities

**Achievement**:

* **MongoDB** stores latest locations in driver_locations with unique driver_id index and historical data in driver_location_history with { driver_id: 1, timestamp: -1 } and TTL (30 days) indexes.
* **Redis** caches latest locations (\~0.1ms reads) with setex.
* GET /location retrieves latest location from **Redis** or **MongoDB**, caching results.
* Optional GET /location/history queries historical data by driver_id and time range, sorted by timestamp.

**Testing**:

1. Start the API:

   `./start.sh`
2. Post a location (from Task 2).
3. Get latest location:

   `curl http://localhost:3000/location?driver_id=driver_001`

   **Expected Outcome**:
   * Response: { "driver_id": "driver_001", "latitude": 1.342597, "longitude": 103.864783, "updated_at": "..." }
4. Get historical locations:

   `curl "http://localhost:3000/location/history?driver_id=driver_001&start_time=2025-05-01T00:00:00Z&end_time=2025-05-02T00:00:00Z"`

   **Expected Outcome**:
   * Response: Array of locations, e.g., \[{ "driver_id": "driver_001", "latitude": 1.342597, "longitude": 103.864783, "timestamp": "..." }, ...\]

## Code Quality

* **Prettier**: Formats TypeScript files (`npm run format`).
* **ESLint**: Enforces TypeScript rules (`npm run lint`):
  * Prettier integration
  * No unused variables (except `_`-prefixed)
  * Strict equality (`===`)
  * Allow `console.warn/error`, warn on `console.log`

## Testing

Unit tests using Jest and Supertest, mocking `REDIS_CLIENT` and Mongoose models. Example tests in `src/**/*.spec.ts`.

Run:

`npm run test`

## Optimizations

* **MongoDB**: Unique `driver_id` index, `{ driver_id: 1, timestamp: -1 }` index, TTL index (30 days). Writes: \~1–5ms; reads: \~1–10ms.
* **Redis**: Caches ~~10 keys (~~1 KB), \~0.1ms reads, configurable TTL (`REDIS_CACHE_TTL`).
* **NestJS**: Handles \~2 req/s (scalable to 1,000 req/s).
* **Task 1**: Processes 100 updates in \~50s with error handling.

## Scalability

* **10,000–100,000 drivers**: Horizontal scaling, MongoDB sharding, Redis clustering.
* **Future**: Add JWT authentication, WebSockets, or pagination for history.