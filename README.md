# Vercel Blob to Open Web UI Knowledge Sync

This Next.js application automatically syncs documents from Vercel Blob storage to Open Web UI Knowledge base using scheduled cron jobs.

## Features

- 🔄 **Automated Sync**: Runs every hour via Vercel cron jobs
- 📁 **Blob Storage Integration**: Reads all documents from Vercel Blob storage
- 🧠 **Open Web UI Knowledge**: Uploads documents to Open Web UI Knowledge base
- 🔒 **Secure**: Uses API keys and secret tokens for authentication
- 📊 **Detailed Logging**: Comprehensive sync reports and error handling
- 🚀 **Serverless**: Fully serverless deployment on Vercel

## Prerequisites

Before deploying, you need:

1. **Vercel Account** with Blob storage enabled
2. **Open Web UI Instance** with API access
3. **Required API Keys** (details below)

## Environment Variables

Create these environment variables in your Vercel project:

````bash
# Vercel Blob Storage Configuration
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Open Web UI Configuration
OPEN_WEB_UI_BASE_URL=https://your-openwebui-instance.com
OPEN_WEB_UI_API_KEY=your_openwebui_api_key_here

# Knowledge Collection (Optional)
# If provided, files will be automatically added to this collection
KNOWLEDGE_COLLECTION_ID=your_knowledge_collection_id_here

# Cron Security (generate a random string)
CRON_SECRET=your_secret_key_for_cron_endpoint
```### Getting API Keys

#### Vercel Blob Token

1. Go to your Vercel dashboard
2. Navigate to Storage → Blob
3. Create a new token with read/write permissions
4. Copy the token to `BLOB_READ_WRITE_TOKEN`

#### Open Web UI API Key

1. Log into your Open Web UI instance
2. Go to Settings → Account
3. Generate a new API key
4. Copy the key to `OPEN_WEB_UI_API_KEY`
5. Set your Open Web UI base URL to `OPEN_WEB_UI_BASE_URL`

#### Knowledge Collection ID (Optional)

1. In Open Web UI, create a new Knowledge Collection
2. Get the collection ID from the URL or API
3. Set `KNOWLEDGE_COLLECTION_ID` to automatically add all files to this collection
4. Leave empty if you want files uploaded individually without collection grouping

## Supported File Types

The sync service supports these file formats:

- **Markdown** (`.md`, `.markdown`)
- **Text** (`.txt`)
- **JSON** (`.json`)
- **HTML** (`.html`)
- **Other** (treated as plain text)

## Deployment to Vercel

### 1. Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy the project
vercel

# Set environment variables
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add OPEN_WEB_UI_BASE_URL
vercel env add OPEN_WEB_UI_API_KEY
vercel env add KNOWLEDGE_COLLECTION_ID  # Optional
vercel env add CRON_SECRET# Redeploy with environment variables
vercel --prod
````

### 2. Deploy via Vercel Dashboard

1. **Connect Repository**

   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**

   - Framework Preset: `Next.js`
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Add Environment Variables**

   - Go to Project Settings → Environment Variables
   - Add all required variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

### 3. Deploy via GitHub Integration

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Auto-Deploy**
   - Vercel will automatically detect and deploy
   - Configure environment variables in Vercel dashboard
   - Redeploy if needed

## Cron Job Configuration

The application is configured to run automatically every hour:

- **Schedule**: `0 * * * *` (every hour at minute 0)
- **Endpoint**: `/api/sync-documents`
- **Method**: `POST`
- **Authentication**: Bearer token using `CRON_SECRET`

### Manual Trigger

You can manually trigger a sync by making a POST request:

```bash
curl -X POST https://your-app.vercel.app/api/sync-documents \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## API Endpoints

### `GET /api/sync-documents`

Returns service information and status.

### `POST /api/sync-documents`

Triggers the sync process. Requires `Authorization: Bearer CRON_SECRET` header.

**Response Example:**

```json
{
  "totalFiles": 5,
  "successful": 4,
  "failed": 1,
  "timestamp": "2024-10-30T13:30:00.000Z",
  "results": [
    {
      "file": "document1.md",
      "status": "success",
      "openWebUIId": "abc123",
      "size": 1024,
      "uploadedAt": "2024-10-30T12:00:00.000Z"
    }
  ],
  "errors": [
    {
      "file": "document2.md",
      "error": "File too large"
    }
  ]
}
```

## Monitoring

### Vercel Function Logs

- Go to Vercel Dashboard → Your Project → Functions
- Click on the sync function to view logs
- Monitor execution times and errors

### Open Web UI Knowledge

- Check your Open Web UI instance
- Navigate to Knowledge section
- Verify documents are being synced
- Documents will be tagged with `vercel-blob` and `auto-sync`

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Testing the Sync

```bash
# Test the endpoint locally
curl -X POST http://localhost:3000/api/sync-documents \
  -H "Authorization: Bearer your_cron_secret"
```

## Troubleshooting

### Common Issues

1. **Unauthorized Error (401)**

   - Check `CRON_SECRET` is set correctly
   - Verify Authorization header format

2. **Missing Environment Variables (500)**

   - Ensure all required environment variables are set
   - Check variable names for typos

3. **Open Web UI Connection Failed**

   - Verify `OPEN_WEB_UI_BASE_URL` is correct
   - Check `OPEN_WEB_UI_API_KEY` is valid
   - Ensure Open Web UI instance is accessible

4. **Blob Storage Access Denied**
   - Verify `BLOB_READ_WRITE_TOKEN` is correct
   - Check token permissions in Vercel dashboard

### Logs and Debugging

Check logs in:

- Vercel Dashboard → Functions → Logs
- Open Web UI admin panel
- Browser network tab for API calls

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Vercel Cron    │───▶│   Next.js API   │───▶│   Open Web UI   │
│   (Hourly)      │    │     Route       │    │   Knowledge     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │                 │
                       │  Vercel Blob    │
                       │    Storage      │
                       │                 │
                       └─────────────────┘
```

## Security Considerations

- All API endpoints are secured with bearer tokens
- Environment variables are encrypted in Vercel
- HTTPS is enforced for all communications
- No sensitive data is logged

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Vercel function logs
3. Open a GitHub issue with details
