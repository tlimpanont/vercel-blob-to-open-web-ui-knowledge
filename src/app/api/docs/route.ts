import { NextRequest, NextResponse } from "next/server";
import swaggerSpec from "@/lib/swagger";

/**
 * @swagger
 * /api/docs:
 *   get:
 *     tags:
 *       - Documentation
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI specification in JSON format
 *     responses:
 *       200:
 *         description: OpenAPI specification returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 specification
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(swaggerSpec, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to generate OpenAPI specification:", error);

    return NextResponse.json(
      {
        error: "Failed to generate OpenAPI specification",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
