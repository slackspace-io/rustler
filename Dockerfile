# Multi-stage build for Rustler - Personal Finance Application

# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build the Rust backend
FROM rust:1.88-slim AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy the actual source code
COPY src/ src/

# Copy the built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Build the application
RUN cargo build --release

# Stage 3: Create the final image
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built binary from the builder stage
COPY --from=backend-builder /app/target/release/rustler /app/rustler

# Copy the built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV RUST_LOG=info

# Expose the application port
EXPOSE 3000

# Create a non-root user to run the application
RUN useradd -m rustler
USER rustler

# Set the entrypoint
ENTRYPOINT ["/app/rustler"]
