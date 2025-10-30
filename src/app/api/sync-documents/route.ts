import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import axios from "axios";

interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      BLOB_READ_WRITE_TOKEN,
      OPEN_WEB_UI_BASE_URL,
      OPEN_WEB_UI_API_KEY,
      KNOWLEDGE_COLLECTION_ID,
    } = process.env;

    if (
      !BLOB_READ_WRITE_TOKEN ||
      !OPEN_WEB_UI_BASE_URL ||
      !OPEN_WEB_UI_API_KEY
    ) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    console.log("Starting document sync from Vercel Blob to Open Web UI...");

    // List all files in blob storage
    const { blobs } = await list({
      token: BLOB_READ_WRITE_TOKEN,
    });

    console.log(`Found ${blobs.length} files in blob storage`);

    const syncResults = [];
    const errors = [];

    for (const blob of blobs) {
      try {
        console.log(`Processing file: ${blob.pathname}`);

        // Get file content
        const response = await fetch(blob.url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch blob content: ${response.statusText}`
          );
        }

        const content = await response.text();

        // Determine file type based on extension
        const fileExtension = blob.pathname.split(".").pop()?.toLowerCase();
        let contentType = "text/plain";

        switch (fileExtension) {
          case "md":
          case "markdown":
            contentType = "text/markdown";
            break;
          case "txt":
            contentType = "text/plain";
            break;
          case "json":
            contentType = "application/json";
            break;
          case "html":
            contentType = "text/html";
            break;
          default:
            contentType = "text/plain";
        }

        // Create a File object (Blob) for upload
        const fileBlob = new Blob([content], { type: contentType });

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", fileBlob, blob.pathname);

        // Step 1: Upload file to Open Web UI
        const uploadResponse = await axios.post(
          `${OPEN_WEB_UI_BASE_URL}/api/v1/files/`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${OPEN_WEB_UI_API_KEY}`,
              Accept: "application/json",
            },
          }
        );

        const fileId = uploadResponse.data?.id;
        if (!fileId) {
          throw new Error("Failed to get file ID from upload response");
        }

        console.log(
          `File uploaded successfully: ${blob.pathname}, ID: ${fileId}`
        );

        // Step 2: Optionally add file to knowledge collection
        let collectionStatus = null;
        if (KNOWLEDGE_COLLECTION_ID) {
          try {
            const addToCollectionResponse = await axios.post(
              `${OPEN_WEB_UI_BASE_URL}/api/v1/knowledge/${KNOWLEDGE_COLLECTION_ID}/file/add`,
              { file_id: fileId },
              {
                headers: {
                  Authorization: `Bearer ${OPEN_WEB_UI_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );
            collectionStatus = "added";
            console.log(`File added to knowledge collection: ${blob.pathname}`);
          } catch (collectionError) {
            console.warn(
              `Failed to add file to collection: ${blob.pathname}`,
              collectionError
            );
            collectionStatus = "failed";
          }
        }

        syncResults.push({
          file: blob.pathname,
          status: "success",
          openWebUIId: fileId,
          collectionStatus,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });

        console.log(`Successfully synced: ${blob.pathname}`);
      } catch (error) {
        console.error(`Error processing ${blob.pathname}:`, error);
        errors.push({
          file: blob.pathname,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const summary = {
      totalFiles: blobs.length,
      successful: syncResults.length,
      failed: errors.length,
      timestamp: new Date().toISOString(),
      results: syncResults,
      errors: errors,
    };

    console.log("Sync completed:", summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Sync operation failed:", error);
    return NextResponse.json(
      {
        error: "Sync operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Vercel Blob to Open Web UI Sync Service",
    endpoint: "/api/sync-documents",
    method: "POST",
    description:
      "Syncs documents from Vercel Blob storage to Open Web UI Knowledge base",
    lastUpdated: new Date().toISOString(),
  });
}
