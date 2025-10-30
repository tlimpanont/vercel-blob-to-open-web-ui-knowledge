import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import axios from "axios";

interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

interface UploadedFile {
  id: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

interface SyncResult {
  file: string;
  status: string;
  openWebUIId: string;
  collectionStatus?: string | null;
  size: number;
  uploadedAt: Date;
}

/**
 * @swagger
 * /api/sync-documents:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync documents from Vercel Blob to Open Web UI
 *     description: Syncs all documents from Vercel Blob storage to Open Web UI Knowledge base using a two-phase approach - upload all files first, then add processed files to knowledge collection
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalFiles:
 *                   type: integer
 *                   description: Total number of files processed
 *                   example: 15
 *                 successful:
 *                   type: integer
 *                   description: Number of files successfully uploaded
 *                   example: 15
 *                 failed:
 *                   type: integer
 *                   description: Number of files that failed to upload
 *                   example: 0
 *                 addedToCollection:
 *                   type: integer
 *                   description: Number of files added to knowledge collection
 *                   example: 11
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Sync completion timestamp
 *                   example: "2025-10-30T14:33:31.715Z"
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       file:
 *                         type: string
 *                         description: File name
 *                         example: "document.pdf"
 *                       status:
 *                         type: string
 *                         description: Upload status
 *                         example: "uploaded"
 *                       openWebUIId:
 *                         type: string
 *                         description: File ID in Open Web UI
 *                         example: "a1c12df5-d710-49b5-89bc-2f9fddcad1d4"
 *                       collectionStatus:
 *                         type: string
 *                         nullable: true
 *                         description: Collection assignment status
 *                         example: "added"
 *                       size:
 *                         type: integer
 *                         description: File size in bytes
 *                         example: 106895
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 *                         description: File upload timestamp
 *                         example: "2025-10-29T22:12:47.000Z"
 *                 errors:
 *                   type: array
 *                   description: List of errors encountered during sync
 *                   items:
 *                     type: object
 *                     properties:
 *                       file:
 *                         type: string
 *                         description: File name that failed
 *                       error:
 *                         type: string
 *                         description: Error message
 *       401:
 *         description: Unauthorized - Invalid or missing bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sync operation failed"
 *                 details:
 *                   type: string
 *                   example: "Missing required environment variables"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-30T17:15:00.000Z"
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get sync service information
 *     description: Returns information about the sync service endpoint for testing and discovery
 *     responses:
 *       200:
 *         description: Service information returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vercel Blob to Open Web UI Sync Service"
 *                 endpoint:
 *                   type: string
 *                   example: "/api/sync-documents"
 *                 method:
 *                   type: string
 *                   example: "POST"
 *                 description:
 *                   type: string
 *                   example: "Syncs documents from Vercel Blob storage to Open Web UI Knowledge base"
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-30T17:15:00.000Z"
 */

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

    // PHASE 1: Upload all files to Open Web UI
    console.log("PHASE 1: Uploading files to Open Web UI...");
    const uploadResults: SyncResult[] = [];
    const uploadErrors = [];
    const uploadedFiles: UploadedFile[] = [];

    for (const blob of blobs) {
      try {
        console.log(`Uploading file: ${blob.pathname}`);

        // Get file content from Vercel Blob
        const response = await fetch(blob.url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch blob content: ${response.statusText}`
          );
        }

        // Determine file type and content handling
        const fileExtension = blob.pathname.split(".").pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        let content: ArrayBuffer | string;

        switch (fileExtension) {
          case "md":
          case "markdown":
            contentType = "text/markdown";
            content = await response.text();
            break;
          case "txt":
            contentType = "text/plain";
            content = await response.text();
            break;
          case "json":
            contentType = "application/json";
            content = await response.text();
            break;
          case "html":
            contentType = "text/html";
            content = await response.text();
            break;
          case "pdf":
            contentType = "application/pdf";
            content = await response.arrayBuffer();
            break;
          case "doc":
          case "docx":
            contentType =
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            content = await response.arrayBuffer();
            break;
          case "xls":
          case "xlsx":
            contentType =
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            content = await response.arrayBuffer();
            break;
          case "ppt":
          case "pptx":
            contentType =
              "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            content = await response.arrayBuffer();
            break;
          case "jpg":
          case "jpeg":
            contentType = "image/jpeg";
            content = await response.arrayBuffer();
            break;
          case "png":
            contentType = "image/png";
            content = await response.arrayBuffer();
            break;
          case "gif":
            contentType = "image/gif";
            content = await response.arrayBuffer();
            break;
          default:
            content = await response.arrayBuffer();
        }

        // Create file blob for upload
        const fileBlob = new Blob([content], { type: contentType });
        const formData = new FormData();
        formData.append("file", fileBlob, blob.pathname);

        // Upload to Open Web UI
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

        console.log(`✅ Uploaded: ${blob.pathname} → ID: ${fileId}`);

        // Store for later processing
        uploadedFiles.push({
          id: fileId,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });

        uploadResults.push({
          file: blob.pathname,
          status: "uploaded",
          openWebUIId: fileId,
          collectionStatus: null,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });
      } catch (error) {
        console.error(`❌ Upload failed: ${blob.pathname}`, error);
        uploadErrors.push({
          file: blob.pathname,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `PHASE 1 Complete: ${uploadedFiles.length} files uploaded, ${uploadErrors.length} failed`
    );

    // PHASE 2: Wait for processing and add to knowledge collection
    const finalResults: SyncResult[] = [...uploadResults];

    if (KNOWLEDGE_COLLECTION_ID && uploadedFiles.length > 0) {
      console.log("PHASE 2: Adding processed files to knowledge collection...");
      console.log(`Waiting for files to be processed by Open Web UI...`);

      // Give Open Web UI time to process the files
      await new Promise((resolve) => setTimeout(resolve, 5000));

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        console.log(
          `Processing ${i + 1}/${uploadedFiles.length}: ${
            uploadedFile.pathname
          }`
        );

        try {
          // Check file processing status with retries
          let fileReady = false;
          let attempts = 0;
          const maxAttempts = 6;

          while (!fileReady && attempts < maxAttempts) {
            attempts++;

            try {
              const fileStatusResponse = await axios.get(
                `${OPEN_WEB_UI_BASE_URL}/api/v1/files/${uploadedFile.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${OPEN_WEB_UI_API_KEY}`,
                  },
                }
              );

              const fileData = fileStatusResponse.data;
              const isProcessed = fileData.data?.status === "completed";
              const hasContent =
                fileData.data?.content &&
                fileData.data.content.trim().length > 0;

              if (isProcessed && hasContent) {
                fileReady = true;
                console.log(
                  `✅ File ready: ${uploadedFile.pathname} (${fileData.data.content.length} chars extracted)`
                );
              } else {
                console.log(
                  `⏳ File processing... ${uploadedFile.pathname} (attempt ${attempts}/${maxAttempts})`
                );
                if (attempts < maxAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 3000));
                }
              }
            } catch (statusError) {
              console.error(
                `Error checking status for ${uploadedFile.pathname}:`,
                statusError
              );
              break;
            }
          }

          // Update result based on processing status
          const resultIndex = finalResults.findIndex(
            (r) => r.openWebUIId === uploadedFile.id
          );

          if (!fileReady) {
            console.log(
              `⚠️  File not ready for collection: ${uploadedFile.pathname}`
            );
            if (resultIndex >= 0) {
              finalResults[resultIndex] = {
                ...finalResults[resultIndex],
                collectionStatus: "not-processed",
              };
            }
            continue;
          }

          // Try to add to knowledge collection
          try {
            const addToCollectionResponse = await axios.post(
              `${OPEN_WEB_UI_BASE_URL}/api/v1/knowledge/${KNOWLEDGE_COLLECTION_ID}/file/add`,
              { file_id: uploadedFile.id },
              {
                headers: {
                  Authorization: `Bearer ${OPEN_WEB_UI_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`🎯 Added to collection: ${uploadedFile.pathname}`);

            if (resultIndex >= 0) {
              finalResults[resultIndex] = {
                ...finalResults[resultIndex],
                collectionStatus: "added",
              };
            }
          } catch (collectionError: any) {
            console.error(
              `❌ Collection add failed: ${uploadedFile.pathname}`,
              {
                status: collectionError.response?.status,
                data: collectionError.response?.data,
              }
            );

            if (resultIndex >= 0) {
              finalResults[resultIndex] = {
                ...finalResults[resultIndex],
                collectionStatus: "collection-failed",
              };
            }
          }
        } catch (error) {
          console.error(
            `❌ Processing failed: ${uploadedFile.pathname}`,
            error
          );
          const resultIndex = finalResults.findIndex(
            (r) => r.openWebUIId === uploadedFile.id
          );
          if (resultIndex >= 0) {
            finalResults[resultIndex] = {
              ...finalResults[resultIndex],
              collectionStatus: "error",
            };
          }
        }
      }

      console.log("PHASE 2 Complete: Knowledge collection assignment finished");
    } else {
      console.log("PHASE 2 Skipped: No knowledge collection ID provided");
      // Set collection status to null for all results
      finalResults.forEach((result, index) => {
        finalResults[index] = {
          ...result,
          collectionStatus: null,
        };
      });
    }

    // Summary
    const successful = finalResults.filter(
      (r) => r.status === "uploaded"
    ).length;
    const addedToCollection = finalResults.filter(
      (r) => r.collectionStatus === "added"
    ).length;

    const summary = {
      totalFiles: blobs.length,
      successful: successful,
      failed: uploadErrors.length,
      addedToCollection: addedToCollection,
      timestamp: new Date().toISOString(),
      results: finalResults,
      errors: uploadErrors,
    };

    console.log("🎉 Sync completed:", {
      total: summary.totalFiles,
      uploaded: summary.successful,
      failed: summary.failed,
      addedToCollection: summary.addedToCollection,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("❌ Sync operation failed:", error);
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
