import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import axios from "axios";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

const serializeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return {
      type: "AxiosError",
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      method: error.config?.method,
      url: error.config?.url,
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return error;
  }

  return { message: String(error) };
};

const createLogger = (requestId: string) => {
  const baseContext = {
    requestId,
    route: "sync-documents",
  };

  const emit = (
    level: LogLevel,
    message: string,
    context: LogContext = {}
  ) => {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseContext,
      ...context,
    });

    switch (level) {
      case "error":
        console.error(entry);
        break;
      case "warn":
        console.warn(entry);
        break;
      default:
        console.log(entry);
    }
  };

  return {
    info: (message: string, context?: LogContext) =>
      emit("info", message, context),
    warn: (message: string, context?: LogContext) =>
      emit("warn", message, context),
    debug: (message: string, context?: LogContext) =>
      emit("debug", message, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
      emit("error", message, {
        ...context,
        error: error ? serializeError(error) : undefined,
      }),
  };
};

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
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);
  const startedAt = Date.now();

  logger.info("Sync request received", {
    method: request.method,
    url: request.url,
  });

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized sync attempt blocked", {
        hasAuthHeader: Boolean(authHeader),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      BLOB_READ_WRITE_TOKEN,
      OPEN_WEB_UI_BASE_URL,
      OPEN_WEB_UI_API_KEY,
      KNOWLEDGE_COLLECTION_ID,
    } = process.env;

    const missingEnvVars = [
      !BLOB_READ_WRITE_TOKEN && "BLOB_READ_WRITE_TOKEN",
      !OPEN_WEB_UI_BASE_URL && "OPEN_WEB_UI_BASE_URL",
      !OPEN_WEB_UI_API_KEY && "OPEN_WEB_UI_API_KEY",
    ].filter(Boolean) as string[];

    if (missingEnvVars.length > 0) {
      logger.error("Missing required environment variables", undefined, {
        missingEnvVars,
      });
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    logger.info("Starting document sync from Vercel Blob to Open Web UI");

    // List all files in blob storage
    const { blobs } = await list({
      token: BLOB_READ_WRITE_TOKEN,
    });

    logger.info("Blob listing completed", { blobCount: blobs.length });

    // PHASE 1: Upload all files to Open Web UI
    logger.info("Phase 1: uploading files to Open Web UI", {
      blobCount: blobs.length,
    });
    const uploadResults: SyncResult[] = [];
    const uploadErrors: Array<{ file: string; error: string }> = [];
    const uploadedFiles: UploadedFile[] = [];

    for (const blob of blobs) {
      try {
        logger.info("Uploading file", {
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });

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

        logger.info("File uploaded", {
          pathname: blob.pathname,
          openWebUIId: fileId,
        });

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
        logger.error("File upload failed", error, {
          pathname: blob.pathname,
          size: blob.size,
        });
        uploadErrors.push({
          file: blob.pathname,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info("Phase 1 complete", {
      uploaded: uploadedFiles.length,
      failed: uploadErrors.length,
    });

    // PHASE 2: Wait for processing and add to knowledge collection
    const finalResults: SyncResult[] = [...uploadResults];

    if (KNOWLEDGE_COLLECTION_ID && uploadedFiles.length > 0) {
      logger.info("Phase 2: adding processed files to knowledge collection", {
        knowledgeCollectionId: KNOWLEDGE_COLLECTION_ID,
        filesToProcess: uploadedFiles.length,
      });

      const processingDelayMs = 5000;
      logger.debug("Waiting for Open Web UI processing window", {
        delayMs: processingDelayMs,
      });

      // Give Open Web UI time to process the files
      await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];
        logger.info("Processing uploaded file", {
          index: i + 1,
          total: uploadedFiles.length,
          pathname: uploadedFile.pathname,
        });

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

              logger.debug("Checked file processing status", {
                pathname: uploadedFile.pathname,
                attempt: attempts,
                isProcessed,
                hasContent,
              });

              if (isProcessed && hasContent) {
                fileReady = true;
                logger.info("File ready for collection", {
                  pathname: uploadedFile.pathname,
                  contentLength: fileData.data.content.length,
                });
              } else if (attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
              }
            } catch (statusError) {
              logger.error("Failed to check processing status", statusError, {
                pathname: uploadedFile.pathname,
                attempt: attempts,
              });
              break;
            }
          }

          // Update result based on processing status
          const resultIndex = finalResults.findIndex(
            (r) => r.openWebUIId === uploadedFile.id
          );

          if (!fileReady) {
            logger.warn("File not ready for collection", {
              pathname: uploadedFile.pathname,
            });
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
            await axios.post(
              `${OPEN_WEB_UI_BASE_URL}/api/v1/knowledge/${KNOWLEDGE_COLLECTION_ID}/file/add`,
              { file_id: uploadedFile.id },
              {
                headers: {
                  Authorization: `Bearer ${OPEN_WEB_UI_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            logger.info("File added to knowledge collection", {
              pathname: uploadedFile.pathname,
              collectionId: KNOWLEDGE_COLLECTION_ID,
            });

            if (resultIndex >= 0) {
              finalResults[resultIndex] = {
                ...finalResults[resultIndex],
                collectionStatus: "added",
              };
            }
          } catch (collectionError: any) {
            logger.error("Failed to add file to knowledge collection", collectionError, {
              pathname: uploadedFile.pathname,
              collectionId: KNOWLEDGE_COLLECTION_ID,
            });

            if (resultIndex >= 0) {
              finalResults[resultIndex] = {
                ...finalResults[resultIndex],
                collectionStatus: "collection-failed",
              };
            }
          }
        } catch (error) {
          logger.error("Processing failed for uploaded file", error, {
            pathname: uploadedFile.pathname,
          });
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

      logger.info("Phase 2 complete: knowledge collection assignment finished");
    } else {
      logger.info("Phase 2 skipped", {
        reason: KNOWLEDGE_COLLECTION_ID ? "no-files-to-process" : "missing-collection-id",
      });
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

    logger.info("Sync completed successfully", {
      totalFiles: summary.totalFiles,
      uploaded: summary.successful,
      failed: summary.failed,
      addedToCollection: summary.addedToCollection,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Sync operation failed", error, {
      durationMs: Date.now() - startedAt,
    });
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
