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
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      {
        url: "https://vercel-blob-to-open-web-ui-knowledge-4l5rwgw0j.vercel.app",
        description: "Production Server (Vercel)",
      },
      {
        url: "{protocol}://{host}:{port}",
        description: "Custom Server",
        variables: {
          protocol: {
            enum: ["http", "https"],
            default: "https",
            description: "The protocol to use",
          },
          host: {
            default: "your-domain.com",
            description: "The hostname or IP address",
          },
          port: {
            enum: ["3000", "3001", "8080", "80", "443"],
            default: "443",
            description: "The port number",
          },
        },
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
