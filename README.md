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
- **Frontend**: HTML templates with Askama templating engine
- **Authentication**: (To be implemented)

## Prerequisites

- Rust (latest stable version)
- PostgreSQL database
- Cargo (Rust package manager)

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

1. Build the application:
   ```bash
   cargo build
   ```

2. Run the application:
   ```bash
   cargo run
   ```

   The server will start on the configured host and port (default: http://127.0.0.1:3000).

## Development

### Running in Development Mode

```bash
cargo run
```

### Running Tests

```bash
cargo test
```

## Project Structure

- `src/config`: Application configuration
- `src/db`: Database connection and migration handling
- `src/models`: Data models and request/response structures
- `src/routes`: API route handlers
- `src/services`: Business logic for accounts and transactions
- `src/static`: Static assets (CSS, JavaScript)
- `src/templates`: HTML templates

## API Endpoints

The application provides the following API endpoints:

- **Accounts**:
  - `GET /accounts`: List all accounts
  - `GET /accounts/{id}`: Get a specific account
  - `POST /accounts`: Create a new account
  - `PUT /accounts/{id}`: Update an account
  - `DELETE /accounts/{id}`: Delete an account

- **Transactions**:
  - `GET /transactions`: List all transactions (with optional filtering)
  - `GET /accounts/{id}/transactions`: List transactions for a specific account
  - `GET /transactions/{id}`: Get a specific transaction
  - `POST /transactions`: Create a new transaction
  - `PUT /transactions/{id}`: Update a transaction
  - `DELETE /transactions/{id}`: Delete a transaction

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
