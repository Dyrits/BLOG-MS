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
- **posts-api:** Runs the PostsPage API service.
- **comments-api:** Runs the Comments API service.

## Ports

The services will be available on the following ports:
- `react-client`: [http://localhost:5173](http://localhost:5173)
- `posts-api`: [http://localhost:4005](http://localhost:4005)
- `comments-api`: [http://localhost:4010](http://localhost:4010)

## Development

The `compose.development.yml` file is configured to watch for changes in the source code and automatically sync, rebuild, or restart the services as needed. This allows for a smooth development experience without needing to manually restart the services.

## Conclusion

You should now be able to set up and launch the project using Docker Compose. If you encounter any issues, please refer to the Docker and Docker Compose documentation or seek help from the project maintainers.