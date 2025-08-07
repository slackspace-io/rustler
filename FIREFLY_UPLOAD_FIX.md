# Firefly III CSV Upload Fix

## Issue Description

The issue was that users could not click the import button even if they had selected files to upload, unless they also populated the file paths. This was confusing for users who wanted to upload files directly from their computer rather than specifying server-side file paths.

## Multipart Form Data Parsing Fix

After implementing the initial file upload functionality, we encountered an error when trying to upload files:

```
error[E0599]: no method named `stream` found for struct `axum::extract::multipart::Field` in the current scope
   --> src/routes/imports.rs:107:32
    |
107 |         let mut stream = field.stream();
    |                                ^^^^^^
    |
help: there is a method `into_stream` with a similar name
    |
107 |         let mut stream = field.into_stream();
    |                                +++++
```

The issue was that the code was using `field.stream()` which is not a valid method for the `Field` struct in the current version of Axum. We fixed this by replacing the streaming approach with a simpler approach that reads the entire field data at once using `field.bytes().await`.

## Changes Made

### Backend Changes

1. Added multipart form support to Axum in `Cargo.toml`:
   ```toml
   axum = { version = "0.8.4", features = ["multipart"] }
   ```

2. Implemented a new endpoint in `src/routes/imports.rs` to handle file uploads:
   ```rust
   .route("/imports/firefly/upload", post(upload_firefly_csv))
   ```

3. Created the `upload_firefly_csv` handler function that:
   - Processes multipart form data
   - Saves uploaded files to a temporary directory
   - Passes the file paths to the existing import service
   - Cleans up temporary files after import

### Frontend Changes

1. Added a new API function in `frontend/src/services/api.ts` to handle file uploads:
   ```typescript
   uploadFireflyCsv: async (accountsFile: File, transactionsFile: File): Promise<ImportResult> => {
     const formData = new FormData();
     formData.append('accounts', accountsFile);
     formData.append('transactions', transactionsFile);
     
     const response = await fetch(`${API_BASE_URL}/imports/firefly/upload`, {
       method: 'POST',
       body: formData,
     });
     
     if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`Failed to upload CSV files: ${errorText}`);
     }
     
     return response.json();
   }
   ```

2. Updated the `FireflyImport.tsx` component to:
   - Add state variables for uploaded files
   - Add file input fields with handlers
   - Update the import logic to use the new upload API when files are selected
   - Fix the disabled condition for the import button

3. The key fix for the issue was updating the disabled condition for the import button:
   ```tsx
   disabled={isImporting || (
     importMethod === 'api' 
       ? !apiUrl || !apiToken 
       : !(
           (accountsCsvPath && transactionsCsvPath) || 
           (accountsFile && transactionsFile)
         )
   )}
   ```

   This condition enables the button when:
   - For API import: both API URL and token are provided
   - For CSV import: EITHER both file paths are provided OR both files are uploaded

## Testing

1. Created a test script `test_firefly_upload.sh` to verify the backend functionality
2. Tested the script to confirm that file uploads work correctly
3. Rebuilt the frontend to apply the UI changes

## Result

Users can now:
1. Select CSV files for upload directly from their computer
2. See the import button enabled as soon as both files are selected
3. Successfully import data from the uploaded files

This provides a more intuitive user experience, especially for users who don't have direct access to the server file system.

## Multipart Form Data Parsing Fix

After implementing the initial file upload functionality, we encountered an error when trying to upload files:

```
error[E0599]: no method named `stream` found for struct `axum::extract::multipart::Field` in the current scope
   --> src/routes/imports.rs:107:32
    |
107 |         let mut stream = field.stream();
    |                                ^^^^^^
```

The issue was that the code was using `field.stream()` which is not a valid method for the `Field` struct in the current version of Axum. We fixed this by replacing the streaming approach with a simpler approach that reads the entire field data at once using `field.bytes().await`.

The updated code in `src/routes/imports.rs`:

```rust
// Read the field data
let data = field.bytes().await.map_err(|e| {
    error!("Failed to read file data: {}", e);
    (
        StatusCode::BAD_REQUEST,
        Json(format!("Failed to read file data: Error parsing `multipart/form-data` request: {}", e)),
    )
})?;

// Write the data to the file
file.write_all(&data).await.map_err(|e| {
    error!("Failed to write file: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(format!("Failed to write file: {}", e)),
    )
})?;
```

This fix ensures that file uploads work correctly with the current version of Axum.
