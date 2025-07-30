# Multi-stage build for Firefly Tracker application

# Stage 1: Build the Rust backend
FROM rust:1.76-slim as backend-builder

WORKDIR /app/backend

# Install build dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/Cargo.toml .
COPY backend/src ./src

# Build the backend in release mode
RUN cargo build --release

# Stage 2: Build the React frontend
FROM node:20-slim as frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 3: Final image
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy the backend binary from the builder stage
COPY --from=backend-builder /app/backend/target/release/firefly-tracker-backend /app/firefly-tracker-backend

# Copy the frontend build from the builder stage
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create config directory
RUN mkdir -p /app/config

# Copy sample config file
COPY config/sample.toml /app/config/default.toml

# Expose the port the server listens on
EXPOSE 8080

# Set environment variables
ENV APP_SERVER__HOST=0.0.0.0
ENV APP_SERVER__PORT=8080

# Run the backend server
CMD ["/app/firefly-tracker-backend"]
