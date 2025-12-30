# LoqiNotes Postman Collection

This directory contains the Postman collection and environment files for testing the LoqiNotes API.

## Files

- `loqi-notes-collection.json` - Complete API collection with all endpoints
- `loqi-notes-environment.json` - Environment variables for local development

## Setup

1. **Import Collection**
   - Open Postman
   - Click "Import" button
   - Select `loqi-notes-collection.json`

2. **Import Environment**
   - Click "Import" button
   - Select `loqi-notes-environment.json`
   - Select the "LoqiNotes Local" environment from the dropdown

3. **Get Authentication Token**
   - Go to your Supabase Dashboard
   - Navigate to Authentication > Users
   - Create a test user or select an existing one
   - Copy the JWT access token
   - In Postman, update the `authToken` variable with your token

4. **Test the API**
   - Start with the "Health Check" request to verify the server is running
   - Test "Get Session" to verify authentication is working
   - Explore other endpoints in the collection

## Collection Structure

- **Health** - Server health check
- **Auth** - Authentication and user profile
- **Notes** - Notes CRUD operations
- **Tags** - Tag management
- **Search** - Semantic search
- **AI** - AI-powered features
- **Quiz** - Quiz generation and attempts
- **Study** - Spaced repetition system

## Variables

The collection uses the following variables:

- `baseUrl` - API base URL (default: `http://localhost:3001`)
- `authToken` - JWT authentication token from Supabase

## Notes

- All endpoints except the health check require authentication
- Include the `Authorization: Bearer {{authToken}}` header for authenticated requests
- tRPC queries use GET requests with URL-encoded JSON input
- tRPC mutations use POST requests with JSON body
- Replace placeholder UUIDs (`note-uuid-here`, etc.) with actual IDs from your database

## Example: Getting Started

1. **Health Check**
   ```
   GET http://localhost:3001/health
   ```

2. **Get Session** (requires auth token)
   ```
   GET http://localhost:3001/api/v1/trpc/auth.getSession
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

3. **Create a Note**
   ```
   POST http://localhost:3001/api/v1/trpc/notes.create
   Authorization: Bearer YOUR_TOKEN_HERE
   Content-Type: application/json

   {
     "title": "My First Note",
     "content": "This is my first note in LoqiNotes!"
   }
   ```
