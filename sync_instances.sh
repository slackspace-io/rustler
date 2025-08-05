#!/bin/bash

# Rustler Instance Sync Script
# This script syncs data between two Rustler instances by dumping the database from the source
# instance and restoring it to the target instance.

# Display usage information
function show_usage {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -s, --source-host HOST       Source database host (default: from .env)"
    echo "  -d, --source-db DB           Source database name (default: from .env)"
    echo "  -u, --source-user USER       Source database user (default: from .env)"
    echo "  -p, --source-password PASS   Source database password (default: from .env)"
    echo "  -t, --target-host HOST       Target database host (required)"
    echo "  -b, --target-db DB           Target database name (default: same as source)"
    echo "  -v, --target-user USER       Target database user (default: same as source)"
    echo "  -w, --target-password PASS   Target database password (default: same as source)"
    echo "  -f, --dump-file FILE         Path to dump file (default: ./rustler_dump.sql)"
    echo "  -a, --api-sync               Use API for syncing instead of database dump/restore"
    echo "  -h, --help                   Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --target-host 192.168.1.100"
    echo ""
    echo "Note: This script requires the PostgreSQL client tools (pg_dump, psql) to be installed."
}

# Parse command line arguments
SOURCE_HOST=""
SOURCE_DB=""
SOURCE_USER=""
SOURCE_PASSWORD=""
TARGET_HOST=""
TARGET_DB=""
TARGET_USER=""
TARGET_PASSWORD=""
DUMP_FILE="./rustler_dump.sql"
USE_API=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--source-host)
            SOURCE_HOST="$2"
            shift 2
            ;;
        -d|--source-db)
            SOURCE_DB="$2"
            shift 2
            ;;
        -u|--source-user)
            SOURCE_USER="$2"
            shift 2
            ;;
        -p|--source-password)
            SOURCE_PASSWORD="$2"
            shift 2
            ;;
        -t|--target-host)
            TARGET_HOST="$2"
            shift 2
            ;;
        -b|--target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        -v|--target-user)
            TARGET_USER="$2"
            shift 2
            ;;
        -w|--target-password)
            TARGET_PASSWORD="$2"
            shift 2
            ;;
        -f|--dump-file)
            DUMP_FILE="$2"
            shift 2
            ;;
        -a|--api-sync)
            USE_API=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if target host is provided
if [ -z "$TARGET_HOST" ]; then
    echo "Error: Target host is required."
    show_usage
    exit 1
fi

# Load values from .env file if not provided
if [ -z "$SOURCE_HOST" ] || [ -z "$SOURCE_DB" ] || [ -z "$SOURCE_USER" ] || [ -z "$SOURCE_PASSWORD" ]; then
    if [ -f .env ]; then
        echo "Loading database connection details from .env file..."

        # Extract database connection details from .env file
        DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f 2)

        # Parse the database URL
        if [[ $DB_URL =~ postgres://([^:]+):([^@]+)@([^/]+)/(.+) ]]; then
            DEFAULT_USER="${BASH_REMATCH[1]}"
            DEFAULT_PASSWORD="${BASH_REMATCH[2]}"
            DEFAULT_HOST="${BASH_REMATCH[3]}"
            DEFAULT_DB="${BASH_REMATCH[4]}"

            # Set default values if not provided
            SOURCE_HOST="${SOURCE_HOST:-$DEFAULT_HOST}"
            SOURCE_DB="${SOURCE_DB:-$DEFAULT_DB}"
            SOURCE_USER="${SOURCE_USER:-$DEFAULT_USER}"
            SOURCE_PASSWORD="${SOURCE_PASSWORD:-$DEFAULT_PASSWORD}"
        else
            echo "Error: Could not parse DATABASE_URL from .env file."
            exit 1
        fi
    else
        echo "Error: .env file not found and source database connection details not provided."
        show_usage
        exit 1
    fi
fi

# Set target database details to match source if not provided
TARGET_DB="${TARGET_DB:-$SOURCE_DB}"
TARGET_USER="${TARGET_USER:-$SOURCE_USER}"
TARGET_PASSWORD="${TARGET_PASSWORD:-$SOURCE_PASSWORD}"

# Display sync information
echo "Syncing Rustler instances:"
echo "  Source: $SOURCE_USER@$SOURCE_HOST/$SOURCE_DB"
echo "  Target: $TARGET_USER@$TARGET_HOST/$TARGET_DB"
echo "  Dump file: $DUMP_FILE"
echo "  Method: $([ "$USE_API" = true ] && echo "API" || echo "Database dump/restore")"
echo ""

# Confirm before proceeding
read -p "This will overwrite data in the target database. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Function to sync using database dump/restore
function sync_via_db {
    echo "Starting database dump from source..."

    # Create dump file
    PGPASSWORD="$SOURCE_PASSWORD" pg_dump -h "$SOURCE_HOST" -U "$SOURCE_USER" -d "$SOURCE_DB" -F p -f "$DUMP_FILE"

    if [ $? -ne 0 ]; then
        echo "Error: Failed to dump source database."
        exit 1
    fi

    echo "Database dump completed successfully."
    echo "Restoring to target database..."

    # Restore dump file to target database
    PGPASSWORD="$TARGET_PASSWORD" psql -h "$TARGET_HOST" -U "$TARGET_USER" -d "$TARGET_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

    if [ $? -ne 0 ]; then
        echo "Error: Failed to reset target database schema."
        exit 1
    fi

    PGPASSWORD="$TARGET_PASSWORD" psql -h "$TARGET_HOST" -U "$TARGET_USER" -d "$TARGET_DB" -f "$DUMP_FILE"

    if [ $? -ne 0 ]; then
        echo "Error: Failed to restore target database."
        exit 1
    fi

    echo "Database restore completed successfully."
}

# Function to sync using API
function sync_via_api {
    echo "API sync is not implemented yet."
    echo "Please use database dump/restore method instead."
    exit 1
}

# Perform sync
if [ "$USE_API" = true ]; then
    sync_via_api
else
    sync_via_db
fi

echo "Sync completed successfully!"
