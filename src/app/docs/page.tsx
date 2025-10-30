"use client";

import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function APIDocsPage() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold">Error Loading Documentation</h2>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <h2 className="text-xl font-semibold">No Documentation Available</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Swagger UI */}
      <div className="swagger-container">
        {/* Server Selector Header */}
        <div className="server-selector-header bg-blue-50 border-b border-blue-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🌐 API Server Selection
            </h3>
            <p className="text-blue-700 text-sm">
              Use the server dropdown in the API specification below to switch
              between development, production, or custom servers. This allows
              you to test the API against different environments directly from
              this documentation.
            </p>
          </div>
        </div>

        <SwaggerUI
          spec={spec}
          docExpansion="list"
          deepLinking={true}
          displayRequestDuration={true}
          tryItOutEnabled={true}
          filter={true}
          layout="BaseLayout"
          supportedSubmitMethods={["get", "post", "put", "delete", "patch"]}
          onComplete={(system: any) => {
            console.log("Swagger UI loaded");
          }}
        />
      </div>

      <style jsx global>{`
        .server-selector-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          backdrop-filter: blur(10px);
        }

        .swagger-container {
          background: white;
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 30px 0;
        }

        .swagger-ui .scheme-container {
          background: #f0f9ff !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 12px !important;
          padding: 20px !important;
          margin: 20px 0 30px 0 !important;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1) !important;
        }

        .swagger-ui .scheme-container .schemes-title {
          color: #1e40af !important;
          font-weight: 600 !important;
          font-size: 16px !important;
          margin-bottom: 10px !important;
        }

        .swagger-ui .scheme-container select {
          background: white !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 14px !important;
          color: #1e40af !important;
          min-width: 300px !important;
        }

        .swagger-ui .scheme-container select:focus {
          outline: none !important;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }

        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }

        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }

        .swagger-ui .opblock-summary {
          padding: 15px 20px;
        }

        .swagger-ui .btn.authorize {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .swagger-ui .btn.authorize:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}
