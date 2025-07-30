# Firefly Tracker

A Rust application that tracks account balances and net worth over time using the Firefly III API.

## Features

- Fetch accounts and their balances from Firefly III
- Calculate net worth over time based on selected accounts
- Interactive chart visualization
- Date range selection
- Responsive design

## Architecture

The application consists of two main components:

1. **Backend**: A Rust web server that communicates with the Firefly III API and provides endpoints for the frontend.
2. **Frontend**: A React application that displays account data and net worth charts.

## Prerequisites

- Docker and Docker Compose (for the easiest setup)
- Firefly III instance with API access
- Personal Access Token for Firefly III API

## Quick Start with Docker

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/firefly-tracker.git
   cd firefly-tracker
   ```

2. Create a configuration file:
   ```bash
   cp config/sample.toml config/default.toml
   ```

3. Edit the configuration file with your Firefly III API details:
   ```bash
   nano config/default.toml
   ```
   
   Update the following settings:
   ```toml
   [firefly]
   api_url = "https://your-firefly-instance.com/api"
   api_token = "your-personal-access-token"
   ```

4. Build and run the Docker container:
   ```bash
   docker build -t firefly-tracker .
   docker run -p 8080:8080 -v $(pwd)/config:/app/config firefly-tracker
   ```

5. Access the application at http://localhost:8080

## Manual Setup

### Backend

1. Install Rust and Cargo:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. Navigate to the backend directory:
   ```bash
   cd firefly-tracker/backend
   ```

3. Build the backend:
   ```bash
   cargo build --release
   ```

4. Create a configuration file:
   ```bash
   mkdir -p config
   cp ../config/sample.toml config/default.toml
   ```

5. Edit the configuration file with your Firefly III API details.

6. Run the backend:
   ```bash
   ./target/release/firefly-tracker-backend
   ```

### Frontend

1. Install Node.js and npm.

2. Navigate to the frontend directory:
   ```bash
   cd firefly-tracker/frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the frontend:
   ```bash
   npm run build
   ```

5. Serve the frontend (you can use any static file server):
   ```bash
   npm install -g serve
   serve -s dist
   ```

## Configuration

The application is configured using a TOML file. You can find a sample configuration in `config/sample.toml`.

### Server Configuration

```toml
[server]
host = "0.0.0.0"  # Host to bind to
port = 8080       # Port to listen on
```

### Firefly III API Configuration

```toml
[firefly]
# URL of the Firefly III API (without trailing slash)
api_url = "https://your-firefly-instance.com/api"

# Personal Access Token for Firefly III API
# You can generate this in Firefly III under Options > Profile > OAuth
api_token = "your-personal-access-token"

# SSL/TLS certificate validation
# Set to true to accept invalid certificates (useful for development/testing)
accept_invalid_certs = false

# Retry configuration
# Maximum number of retry attempts for failed requests
max_retries = 3
# Base delay between retry attempts in milliseconds
retry_delay_ms = 1000

# Debug mode
# Set to true to enable additional debug logging
debug_mode = false
```

You can generate a Personal Access Token in Firefly III under Options > Profile > OAuth.

#### SSL/TLS Certificate Validation

If you're using a self-signed certificate or having SSL/TLS certificate validation issues, you can set `accept_invalid_certs = true` to bypass certificate validation. This is useful for development or testing environments but not recommended for production use.

#### Retry Configuration

The application includes a retry mechanism for handling transient network issues:

- `max_retries`: The maximum number of retry attempts for failed requests (default: 3)
- `retry_delay_ms`: The base delay between retry attempts in milliseconds (default: 1000)

The actual delay between retries uses exponential backoff, increasing with each attempt.

#### Debug Mode

Setting `debug_mode = true` enables additional logging that can help diagnose connection issues.

## API Endpoints

The backend provides the following API endpoints:

### GET /api/health

Health check endpoint.

**Response**: HTTP 200 OK

### GET /api/accounts

Fetch all accounts from Firefly III.

**Response**:
```json
{
  "accounts": [
    {
      "id": "1",
      "name": "Checking Account",
      "type_name": "Asset",
      "currency_code": "USD",
      "current_balance": 1000.50,
      "active": true
    }
  ]
}
```

### POST /api/net-worth

Calculate net worth over time for selected accounts.

**Request**:
```json
{
  "account_ids": ["1", "2", "3"],
  "start_date": "2023-01-01",
  "end_date": "2023-12-31"
}
```

Note: The `start_date` and `end_date` fields are optional.

**Response**:
```json
{
  "accounts": [
    {
      "account": {
        "id": "1",
        "name": "Checking Account",
        "type_name": "Asset",
        "currency_code": "USD",
        "current_balance": 1000.50,
        "active": true
      },
      "balances": [
        {
          "date": "2023-01-01T00:00:00Z",
          "amount": 900.00
        },
        {
          "date": "2023-01-15T00:00:00Z",
          "amount": 950.00
        }
      ]
    },
    {
      "account": {
        "id": "2",
        "name": "Savings Account",
        "type_name": "Asset",
        "currency_code": "USD",
        "current_balance": 5000.00,
        "active": true
      },
      "balances": [
        {
          "date": "2023-01-01T00:00:00Z",
          "amount": 4800.00
        },
        {
          "date": "2023-01-15T00:00:00Z",
          "amount": 5000.00
        }
      ]
    }
  ],
  "net_worth": [
    {
      "date": "2023-01-01T00:00:00Z",
      "amount": 5700.00
    },
    {
      "date": "2023-01-15T00:00:00Z",
      "amount": 5950.00
    }
  ]
}
```

Note: The response includes balance history for each account and the combined net worth over time.

## Usage Examples

### Tracking Net Worth

1. Open the application in your web browser.
2. Select the accounts you want to include in your net worth calculation.
3. Choose a date range (optional).
4. Click "Calculate Net Worth" to see the chart.

### Filtering by Date Range

1. Select the accounts you want to include.
2. Use the date range picker to select a specific period.
3. Click "Calculate Net Worth" to update the chart.

## Development

### Backend

The backend is built with:
- Axum (web framework)
- Reqwest (HTTP client)
- Serde (serialization/deserialization)
- Tokio (async runtime)

To run the backend in development mode:
```bash
cd firefly-tracker/backend
cargo run
```

### Frontend

The frontend is built with:
- React
- Vite
- Chart.js
- Mantine UI

To run the frontend in development mode:
```bash
cd firefly-tracker/frontend
npm run dev
```

## Troubleshooting

### Connection Issues

If you're experiencing connection issues with the Firefly III API, try the following steps:

1. **Verify API URL**: Ensure the `api_url` in your configuration is correct and includes the full path to the API (e.g., `https://your-firefly-instance.com/api`).

2. **Check API Token**: Verify that your Personal Access Token is valid and has not expired. You can generate a new token in Firefly III under Options > Profile > OAuth.

3. **SSL/TLS Certificate Issues**: If you're using a self-signed certificate or encountering SSL/TLS validation errors, set `accept_invalid_certs = true` in your configuration.

4. **Enable Debug Mode**: Set `debug_mode = true` in your configuration to get more detailed logging about the connection attempts and errors.

5. **Check Network Connectivity**: Ensure your server can reach the Firefly III instance. Try using `curl` or another tool to test connectivity:
   ```bash
   curl -v https://your-firefly-instance.com/api/v1/about -H "Authorization: Bearer your-token"
   ```

6. **Firewall Issues**: Check if a firewall is blocking outgoing connections to the Firefly III server.

7. **Proxy Configuration**: If you're behind a proxy, you may need to configure the HTTP_PROXY and HTTPS_PROXY environment variables.

### Common Error Messages

- **"Failed to send request to Firefly III API"**: This indicates a network connectivity issue. Check your network settings, firewall rules, and the API URL.

- **"Firefly III API error (401)"**: This indicates an authentication issue. Verify your API token is correct and has not expired.

- **"Firefly III API error (403)"**: This indicates a permission issue. Ensure your API token has the necessary permissions.

- **"Connection error"**: This could be due to network connectivity issues, SSL/TLS certificate validation failures, or the Firefly III server being down.

## License

MIT
