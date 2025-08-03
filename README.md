# Rustler

A personal finance application built with Rust, providing a web-based interface for managing accounts and tracking financial transactions.

## Features

- **Account Management**: Create, view, update, and delete financial accounts
- **Transaction Tracking**: Record and categorize financial transactions
- **Automatic Balance Updates**: Account balances are automatically updated when transactions are created, modified, or deleted
- **Filtering**: Filter transactions by account, category, and date range
- **RESTful API**: Access all functionality through a well-structured API

## Technology Stack

- **Backend**: Rust with Axum web framework
- **Database**: PostgreSQL with SQLx for database operations
- **Frontend**: React with TypeScript, built with Vite
- **Authentication**: (To be implemented)

## Prerequisites

- Rust (latest stable version)
- PostgreSQL database
- Cargo (Rust package manager)
- Node.js (v16 or later)
- npm (v7 or later)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rustler.git
   cd rustler
   ```

2. Create a `.env` file in the project root with the following variables:
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

3. Set up the database:
   ```bash
   # Create a PostgreSQL database
   createdb rustler
   
   # The application will automatically run migrations on startup
   ```

## Building and Running

1. Build the React frontend:
   ```bash
   # Navigate to the frontend directory
   cd frontend
   
   # Install dependencies
   npm install
   
   # Build the frontend
   npm run build
   ```

2. Build the Rust backend:
   ```bash
   # Return to the project root
   cd ..
   
   # Build the backend
   cargo build
   ```

3. Run the application:
   ```bash
   cargo run
   ```

   The server will start on the configured host and port (default: http://127.0.0.1:3000).
   The React frontend will be served from the same address.

## Development

### Running the Backend in Development Mode

```bash
cargo run
```

### Running the Frontend in Development Mode

```bash
# Navigate to the frontend directory
cd frontend

# Start the development server
npm run dev
```

This will start the Vite development server with hot module replacement (HMR) for a better development experience. The frontend will be available at http://localhost:5173 by default.

#### API Proxy Configuration

When running the frontend in development mode, API requests are proxied to the backend server running at http://localhost:3000. This is configured in the `vite.config.ts` file:

```js
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

Make sure the backend server is running when developing the frontend to ensure API requests work correctly.

### Running Tests

#### Backend Tests

```bash
cargo test
```

#### Frontend Tests

```bash
# Navigate to the frontend directory
cd frontend

# Run tests (when implemented)
npm test
```

## Project Structure

### Backend (Rust)

- `src/config`: Application configuration
- `src/db`: Database connection and migration handling
- `src/models`: Data models and request/response structures
- `src/routes`: API route handlers
- `src/services`: Business logic for accounts and transactions

### Frontend (React + TypeScript)

- `frontend/src/components`: React components
- `frontend/src/services`: API service functions
- `frontend/src/assets`: Static assets (images, etc.)
- `frontend/public`: Public files (favicon, etc.)

## API Endpoints

The application provides the following API endpoints (all prefixed with `/api`):

- **Accounts**:
  - `GET /api/accounts`: List all accounts
  - `GET /api/accounts/{id}`: Get a specific account
  - `POST /api/accounts`: Create a new account
  - `PUT /api/accounts/{id}`: Update an account
  - `DELETE /api/accounts/{id}`: Delete an account

- **Transactions**:
  - `GET /api/transactions`: List all transactions (with optional filtering)
  - `GET /api/accounts/{id}/transactions`: List transactions for a specific account
  - `GET /api/transactions/{id}`: Get a specific transaction
  - `POST /api/transactions`: Create a new transaction
  - `PUT /api/transactions/{id}`: Update a transaction
  - `DELETE /api/transactions/{id}`: Delete a transaction

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
