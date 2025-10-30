import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Vercel Blob to Open Web UI Sync Service
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Service Information
          </h2>
          <p className="text-gray-600 mb-4">
            This service automatically syncs documents from Vercel Blob storage
            to Open Web UI Knowledge base every hour.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-medium text-gray-800 mb-2">API Endpoint</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                POST /api/sync-documents
              </code>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-medium text-gray-800 mb-2">Cron Schedule</h3>
              <p className="text-sm text-gray-600">Every hour (0 * * * *)</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Quick Actions
          </h2>

          <div className="space-y-3">
            <Link
              href="/api/sync-documents"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              View Sync Endpoint
            </Link>

            <div className="text-sm text-gray-600 mt-4">
              <p>
                <strong>Note:</strong> This is a backend service. The frontend
                interface is provided by your Open Web UI instance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
