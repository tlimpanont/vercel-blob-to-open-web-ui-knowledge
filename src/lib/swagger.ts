import { createSwaggerSpec } from "next-swagger-doc";

const swaggerSpec = createSwaggerSpec({
  apiFolder: "src/app/api", // Next.js App Router API folder
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Vercel Blob to Open Web UI Sync API",
      version: "1.0.0",
      description:
        "Automated document sync service from Vercel Blob storage to Open Web UI Knowledge base",
      contact: {
        name: "API Support",
        url: "https://github.com/your-repo",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://your-vercel-app.vercel.app"
            : "http://localhost:3000",
        description:
          process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Bearer token for cron job authentication",
        },
      },
    },
    tags: [
      {
        name: "Sync",
        description: "Document synchronization endpoints",
      },
      {
        name: "Documentation",
        description: "API documentation endpoints",
      },
    ],
  },
});

export default swaggerSpec;
