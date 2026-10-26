# Project Setup and Launch Guide

This guide will help you set up and launch the project using Docker Compose with the `compose.development.yml` file.

## Prerequisites

Ensure you have the following installed on your system:
- Docker
- Docker Compose

## Steps to Launch the Project

1. **Clone the Repository:**

2. **Build and Launch the Project:**
   Use the following command to build and launch the project with Docker Compose:
   ```sh
   docker compose -f compose.development.yml up --watch --build
   ```

   This command will:
    - Build the Docker images specified in the `compose.development.yml` file.
    - Start the services defined in the `compose.development.yml` file.
    - Watch for changes in the specified directories and rebuild/restart the services as needed.

   *Note: You can also use the `Makefile` to run the above command:*
   ```sh
    make watch
   ```

## Services

The `compose.development.yml` file defines the following services:

- **react-client:** Runs the React frontend application.
- **posts-api:** Runs the Posts API service.
- **comments-api:** Runs the Comments API service.
- **event-bus:** Forwards every event to the subscribed services.
- **data-query:** Builds a read model of posts with their comments from events.

## Ports

The services will be available on the following ports:
- `react-client`: [http://localhost:5173](http://localhost:5173)
- `posts-api`: [http://localhost:4005](http://localhost:4005)
- `comments-api`: [http://localhost:4010](http://localhost:4010)
- `event-bus`: [http://localhost:4050](http://localhost:4050)
- `data-query`: [http://localhost:4100](http://localhost:4100)

## Architecture

The client talks to `posts-api` and `comments-api` directly. Each API publishes an event to `event-bus` after a write, and the bus forwards it to every subscribed service. `data-query` is implemented but not wired yet: links marked *(planned)* do not exist in the code.

### Topology

```text
                         Browser
                  react-client  :5173
                  (Vite + React, run by Deno)
                   │                    │
     GET/POST /posts        GET/POST /posts/:id/comments
                   │                    │
                   ▼                    ▼
       posts-api  :4005          comments-api  :4010
       Deno · Effect             Deno · Hono
       data/posts.json           data/posts.json
         │      ▲                  │      ▲
         │      │ POST /events     │      │ POST /events
 PostStored     │        CommentStored    │
         ▼      │                  ▼      │
       ┌──────────────────────────────────────┐
       │           event-bus  :4050           │
       │           Bun · Hono                 │
       │  sends every event to every service  │
       └──────────────────────────────────────┘
                   ┆ POST /events   (planned)
                   ▼
            data-query  :4100
            Bun · Effect
            Ref (in memory): posts with comments
                   ┆
                   ┆ GET /posts   (planned: the client would read from here)
                   ▼
                react-client
```

### Flow of one post and one comment

```text
react-client ─POST /posts {title, content}──────────▶ posts-api
  posts-api      writes data/posts.json
  posts-api ─POST /events {type: PostStored, data: {id, title, content}}──▶ event-bus
    event-bus ─▶ posts-api     /events  (ignored)
    event-bus ─▶ comments-api  /events  (logged)
    event-bus ┄▶ data-query    /events  (planned) → posts[id] = {…, comments: []}

react-client ─POST /posts/:id/comments {content}──────▶ comments-api
  comments-api   writes data/posts.json
  comments-api ─POST /events {type: CommentStored, data: {id, post$id, content}}──▶ event-bus
    event-bus ─▶ posts-api, comments-api  (ignored or logged)
    event-bus ┄▶ data-query  (planned) → posts[post$id].comments += {id, content}

Reading today: GET :4005/posts, then GET :4010/posts/:id/comments for each post
Reading with data-query (planned): one GET :4100/posts
```

### Repository layout

```text
BLOG-MS/
├── compose.development.yml   runs the 5 services, maps their ports, syncs files into containers for watch mode
├── Makefile                  `make watch` starts the stack; `make reset` empties both posts.json files
├── react-client/             UI: pages/PostsPage, components/PostList, PostStore, CommentList, CommentStore
├── posts-api/                source of truth for posts
│   └── src/  api.ts (endpoints) · app.ts (handlers) · domain.ts (schemas)
│             post-repository.ts (stores posts in the file) · event-publisher.ts (sends PostStored)
├── comments-api/             source of truth for comments · src/main.ts (sends CommentStored)
├── event-bus/                app.ts: forwards each POST /events to the subscribed services
└── data-query/               read model: app.ts (the store and `project`) · index.ts (starts the server)
```

## Documentation

- [Conventions](documentation/conventions.md): how code is written here, such as endpoint, event, and method naming.
- [Architecture decision records](documentation/architecture-decision-record/): hard-to-reverse choices and why they were made.

## Development

The `compose.development.yml` file is configured to watch for changes in the source code and automatically sync, rebuild, or restart the services as needed. This allows for a smooth development experience without needing to manually restart the services.

## Conclusion

You should now be able to set up and launch the project using Docker Compose. If you encounter any issues, please refer to the Docker and Docker Compose documentation or seek help from the project maintainers.