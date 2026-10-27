# Blog-MS

A full-stack TypeScript refresher exploring microservice architecture across multiple JavaScript runtimes and frameworks.

**Status:** work in progress - last repository activity: September 2026

## About The Project

Containerized APIs built with Deno, Bun, Effect TS and Hono, alongside a React frontend and an event-driven communication layer.

### Built With

- React (frontend)
- Deno, Bun, Effect TS, Hono (API services)
- Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Installation

1. Clone the repository.
2. Build and launch:
   ```sh
   docker compose -f compose.development.yml up --watch --build
   ```
   Or via the Makefile: `make watch`

## Usage

| Service | URL |
| --- | --- |
| react-client | http://localhost:5173 |
| posts-api | http://localhost:4005 |
| comments-api | http://localhost:4010 |

The development compose file watches for changes and syncs, rebuilds or restarts services automatically.

## License

No license file is present in this repository.

## Contact

Dyrits - https://github.com/Dyrits
