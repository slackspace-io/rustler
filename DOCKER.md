# Docker Support for Rustler

This document describes how to use the Docker image for the Rustler personal finance application.

## Docker Image

The Rustler application is containerized using Docker, allowing for easy deployment and consistent runtime environments. The Docker image includes both the Rust backend and the React frontend.

### Image Tags

- `dev`: Latest development build from the main branch
- `sha-<commit>`: Build tagged with the specific commit SHA

## Running the Docker Image

### Prerequisites

- Docker installed on your system
- PostgreSQL database accessible from the container

### Basic Usage

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://username:password@host/rustler \
  ghcr.io/yourusername/rustler:dev
```

Replace `yourusername` with your GitHub username or organization name.

### Environment Variables

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | *Required* |
| `PORT` | Port to run the server on | `3000` |
| `HOST` | Host to bind the server to | `0.0.0.0` |
| `RUST_LOG` | Logging level | `info` |

### Using Docker Compose

For a more complete setup, you can use Docker Compose. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: rustler
      POSTGRES_PASSWORD: rustler
      POSTGRES_DB: rustler
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    image: ghcr.io/yourusername/rustler:dev
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://rustler:rustler@db/rustler
      PORT: 3000
      HOST: 0.0.0.0
      RUST_LOG: info
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

Then run:

```bash
docker-compose up -d
```

## Building the Docker Image Locally

If you want to build the Docker image locally:

```bash
docker build -t rustler:local .
```

## GitHub Actions Workflow

The repository includes a GitHub Actions workflow that automatically builds and publishes the Docker image to GitHub Container Registry (ghcr.io) when changes are pushed to the main branch.

The workflow file is located at `.github/workflows/docker-build.yml`.

### Manual Workflow Trigger

You can also manually trigger the workflow from the GitHub Actions tab in the repository.

## Accessing the Application

Once the container is running, you can access the application at:

```
http://localhost:3000
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues, ensure:

1. The `DATABASE_URL` environment variable is correctly set
2. The PostgreSQL server is accessible from the container
3. The database user has appropriate permissions

### Container Logs

To view the container logs:

```bash
docker logs <container_id>
```

Replace `<container_id>` with the actual container ID or name.
