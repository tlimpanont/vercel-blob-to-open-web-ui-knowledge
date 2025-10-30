<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization -->

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete

<!-- Next.js TypeScript project for syncing Vercel blob storage to Open Web UI knowledge via cronjobs -->

This is a Next.js TypeScript application that automatically syncs documents from Vercel Blob storage to Open Web UI Knowledge base using scheduled cron jobs.

Key features:

- Hourly automated sync via Vercel cron jobs
- Secure API endpoints with bearer token authentication
- Support for multiple file formats (Markdown, Text, JSON, HTML)
- Comprehensive error handling and logging
- Serverless deployment on Vercel

## API Routes:

- GET/POST /api/sync-documents - Main sync endpoint

## Environment Variables Required:

- BLOB_READ_WRITE_TOKEN - Vercel blob storage token
- OPEN_WEB_UI_BASE_URL - Open Web UI instance URL
- OPEN_WEB_UI_API_KEY - Open Web UI API key
- KNOWLEDGE_COLLECTION_ID - (Optional) Knowledge collection ID for file grouping
- CRON_SECRET - Security token for cron endpoint

## Deployment:

Ready for Vercel deployment with vercel.json configuration for cron jobs.
