import { NextResponse } from "next/server";

// Deprecated — moved to /api/mobile/portal/square-connect/onboard
// Update mobile app to call the new path, then delete this folder.
export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint moved",
      newPath: "/api/mobile/portal/square-connect/onboard",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint moved",
      newPath: "/api/mobile/portal/square-connect/onboard",
    },
    { status: 410 }
  );
}
