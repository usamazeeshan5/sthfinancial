import { NextResponse } from "next/server";

// Deprecated — moved to /api/mobile/portal/square-connect/status
export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint moved",
      newPath: "/api/mobile/portal/square-connect/status",
    },
    { status: 410 }
  );
}
