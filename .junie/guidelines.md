# Rustler Development Guidelines

This document provides guidelines and instructions for developing and testing the Rustler personal finance application.

## Build and Configuration Instructions

### Prerequisites

- Rust (latest stable version)
- PostgreSQL database
- Node.js (v16 or later)
- npm (v7 or later)
- jq (for running test scripts)

### Environment Setup

1. Create a `.env` file in the project root with the following variables:
   ```
   DATABASE_URL=postgres://username:password@localhost/rustler
   PORT=3000
   HOST=127.0.0.1
   RUST_LOG=info
   ```

   Adjust the values according to your environment:
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: Port to run the server on (defaults to 3000)
   - `HOST`: Host to bind the server to (defaults to 127.0.0.1)
   - `RUST_LOG`: Logging level (info, debug, warn, error)

2. Set up the PostgreSQL database:
   ```bash
   # Create a PostgreSQL database
   createdb rustler
   
   # The application will automatically run migrations on startup
   ```

### Building the Application

#### Backend (Rust)

```bash
# Build the backend in debug mode
cargo build

# Build the backend in release mode
cargo build --release
```

#### Frontend (React)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Build the frontend
npm run build
```

### Running the Application

#### Development Mode

1. Run the backend:
   ```bash
   cargo run
   ```

2. In a separate terminal, run the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

   The frontend will be available at http://localhost:5173 and will proxy API requests to the backend at http://localhost:3000.

#### Production Mode

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Run the backend:
   ```bash
   cargo run --release
   ```

   The application will be available at http://localhost:3000 (or the configured host and port).

### Docker Setup

You can also run the application using Docker:

1. Using Docker Compose (recommended):
   ```bash
   docker-compose up -d
   ```
   
   This will start both the PostgreSQL database and the application.

2. Using pre-built Docker image:
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL=postgres://username:password@host/rustler \
     ghcr.io/yourusername/rustler:dev
   ```

## Testing Information

### Backend Testing

#### API Testing with Shell Scripts

The project uses shell scripts to test the API endpoints. These scripts make HTTP requests to the API and verify the responses.

To run an existing test script:

```bash
# Make sure the application is running
cargo run

# In a separate terminal, run the test script
./test_transactions.sh
```

#### Creating a New API Test

1. Create a new shell script in the project root:
   ```bash
   touch test_your_feature.sh
   chmod +x test_your_feature.sh
   ```

2. Add the following template to the script:
   ```bash
   #!/bin/bash
   set -e

   # Test script for your feature

   echo "Testing your feature..."

   # Base URL for the API
   BASE_URL="http://localhost:3000"

   # Your test code here
   # Example:
   # curl -s -X GET "$BASE_URL/api/your-endpoint" | jq .

   echo "Test completed successfully!"
   ```

3. Add your test code to the script, using curl to make HTTP requests and jq to parse JSON responses.

4. Run the script:
   ```bash
   ./test_your_feature.sh
   ```

#### Example: Testing Categories API

Here's an example of a test script that tests the categories API:

```bash
#!/bin/bash
set -e

# Test script for category operations

echo "Testing category operations..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Get all categories
echo "Getting all categories..."
curl -s -X GET "$BASE_URL/api/categories" | jq .

# Create a test category
echo "Creating test category..."
CATEGORY_ID=$(curl -s -X POST "$BASE_URL/api/categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Category","description":"A test category"}' \
  | jq -r '.id')

echo "Category ID: $CATEGORY_ID"

# Get the created category
echo "Getting created category..."
curl -s -X GET "$BASE_URL/api/categories/$CATEGORY_ID" | jq .

# Update the category
echo "Updating category..."
curl -s -X PUT "$BASE_URL/api/categories/$CATEGORY_ID" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated test category description"}' \
  | jq .

# Get the updated category
echo "Getting updated category..."
curl -s -X GET "$BASE_URL/api/categories/$CATEGORY_ID" | jq .

# Delete the category
echo "Deleting category..."
curl -s -X DELETE "$BASE_URL/api/categories/$CATEGORY_ID"

# Verify deletion
echo "Verifying deletion..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/categories/$CATEGORY_ID")
if [[ "$HTTP_STATUS" == "404" ]]; then
  echo "Category successfully deleted (HTTP status: $HTTP_STATUS)"
else
  echo "Error: Category was not deleted (HTTP status: $HTTP_STATUS)"
  exit 1
fi

echo "Test completed successfully!"
```

### Frontend Testing

The frontend uses React's testing capabilities. To run frontend tests:

```bash
cd frontend
npm test
```

## Code Style and Development Guidelines

### Rust Code Style

- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `rustfmt` to format your code:
  ```bash
  rustfmt src/your_file.rs
  ```
- Use `clippy` to catch common mistakes and improve your code:
  ```bash
  cargo clippy
  ```

### Project Structure

#### Backend (Rust)

- `src/config`: Application configuration
- `src/db`: Database connection and migration handling
- `src/models`: Data models and request/response structures
- `src/routes`: API route handlers
- `src/services`: Business logic for accounts and transactions

#### Frontend (React + TypeScript)

- `frontend/src/components`: React components
- `frontend/src/services`: API service functions
- `frontend/src/context`: Context providers (including theme context)
- `frontend/src/assets`: Static assets (images, etc.)
- `frontend/public`: Public files (favicon, etc.)

### Database Migrations

The application uses SQLx for database operations and migrations. Migrations are automatically applied when the application starts.

To add a new migration:

1. Create a new file in `src/db/` with a descriptive name, e.g., `your_migration.rs`
2. Implement the migration logic
3. Add the migration to the list in `src/db/migrations.rs`

### API Development

When adding a new API endpoint:

1. Define the request and response models in `src/models/`
2. Implement the business logic in `src/services/`
3. Add the route handler in `src/routes/`
4. Register the route in the appropriate module

### Theme Support

The application includes a theme system with both light and dark modes:

- Use the existing CSS variables for colors (e.g., `var(--color-bg-primary)`, `var(--color-text-primary)`)
- Add transitions for color changes: `transition: color 0.3s ease, background-color 0.3s ease`
- Access the current theme in components using the `useTheme` hook:
  ```tsx
  import { useTheme } from '../context/ThemeContext';
  
  function MyComponent() {
    const { theme, toggleTheme } = useTheme();
    // Use theme value or toggleTheme function
  }
  ```

## Debugging

### Backend Debugging

- Use the `RUST_LOG` environment variable to control logging level
- Add debug logs with the `tracing` crate:
  ```rust
  use tracing::{debug, info, warn, error};
  
  // Log at different levels
  debug!("Debug message");
  info!("Info message");
  warn!("Warning message");
  error!("Error message");
  ```

### Frontend Debugging

- Use React Developer Tools browser extension
- Use console.log for debugging:
  ```tsx
  console.log('Debug value:', someValue);
  ```
- For API issues, check the Network tab in browser developer tools
