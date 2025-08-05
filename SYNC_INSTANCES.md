# Rustler Instance Sync

This document describes how to use the `sync_instances.sh` script to synchronize data between two Rustler instances.

## Overview

The sync script allows you to copy all data from one Rustler instance to another, including:
- Accounts
- Transactions
- Categories
- Budgets
- All relationships between these entities

This is useful for:
- Setting up a test environment with real data
- Creating backups
- Migrating to a new server

## Prerequisites

- PostgreSQL client tools (`pg_dump` and `psql`) must be installed on the machine running the script
- Network access to both source and target database servers
- Appropriate database credentials for both instances

## Usage

```bash
./sync_instances.sh [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-s, --source-host HOST` | Source database host (default: from .env) |
| `-d, --source-db DB` | Source database name (default: from .env) |
| `-u, --source-user USER` | Source database user (default: from .env) |
| `-p, --source-password PASS` | Source database password (default: from .env) |
| `-t, --target-host HOST` | Target database host (required) |
| `-b, --target-db DB` | Target database name (default: same as source) |
| `-v, --target-user USER` | Target database user (default: same as source) |
| `-w, --target-password PASS` | Target database password (default: same as source) |
| `-f, --dump-file FILE` | Path to dump file (default: ./rustler_dump.sql) |
| `-a, --api-sync` | Use API for syncing instead of database dump/restore (not implemented yet) |
| `-h, --help` | Show help message |

### Examples

#### Sync to a test environment on a different host

```bash
./sync_instances.sh --target-host 192.168.1.100
```

This will:
1. Read source database connection details from the .env file
2. Use the same database name, username, and password for the target
3. Dump the source database to ./rustler_dump.sql
4. Restore the dump to the target database

#### Sync to a test environment with different credentials

```bash
./sync_instances.sh --target-host 192.168.1.100 --target-db rustler_test --target-user test_user --target-password test_password
```

#### Specify source database details manually

```bash
./sync_instances.sh --source-host 10.0.0.1 --source-db rustler_prod --source-user prod_user --source-password prod_password --target-host 192.168.1.100
```

#### Specify a custom dump file location

```bash
./sync_instances.sh --target-host 192.168.1.100 --dump-file /tmp/rustler_backup.sql
```

## How It Works

The sync script works by:

1. Dumping the entire source database using `pg_dump`
2. Dropping and recreating the public schema in the target database
3. Restoring the dump file to the target database using `psql`

This ensures that all data, including tables, indexes, constraints, and relationships, are properly transferred.

## Warning

**This script will overwrite all data in the target database.** Make sure you have a backup or are certain you want to replace all data in the target instance.

## Troubleshooting

### Common Issues

1. **Permission denied**: Make sure the script is executable (`chmod +x sync_instances.sh`)
2. **pg_dump or psql not found**: Install PostgreSQL client tools
3. **Connection refused**: Check network connectivity and firewall settings
4. **Authentication failed**: Verify database credentials

### Error Messages

- **"Error: Failed to dump source database."**: Check source database connection details and permissions
- **"Error: Failed to reset target database schema."**: Check target database connection details and permissions
- **"Error: Failed to restore target database."**: Check target database permissions and disk space

## Future Improvements

- Implement API-based syncing for environments where direct database access is not available
- Add option to sync only specific data (e.g., only accounts or only transactions)
- Add option to preserve existing data in the target database
