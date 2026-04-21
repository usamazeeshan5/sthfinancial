import { NextRequest, NextResponse } from "next/server";
import { merchantAccounts, merchantOnboardingLinks } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  try {
    let accountId = customer.luqraMerchantAccountId;

    // Create a new Merchant Account if one doesn't exist
    if (!accountId) {
      const account = await merchantAccounts.create({
        type: "express",
        email: customer.email,
        metadata: { customerId: customer._id.toString() },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      customer.luqraMerchantAccountId = accountId;
      customer.bankAccountStatus = "pending";
      await customer.save();
    }

    // Generate an Onboarding Link for Luqra-hosted onboarding
    const onboardingLink = await merchantOnboardingLinks.create({
      merchant_account: accountId,
      refresh_url: "https://sthfinancial.vercel.app/api/mobile/portal/luqra-connect/onboard?refresh=true",
      return_url: "https://sthfinancial.vercel.app/api/mobile/portal/luqra-connect/onboard?success=true",
      type: "account_onboarding",
    });

    return NextResponse.json({ url: onboardingLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start Luqra onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Handle return/refresh redirects from Luqra onboarding
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const success = searchParams.get("success");

  if (success) {
    // Redirect to a deep link back to the app
    return new Response(
      `<html><body><p>Onboarding complete! You can return to the app.</p><script>window.location.href="lovetap://payouts";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Refresh case — user needs to restart onboarding
  return new Response(
    `<html><body><p>Session expired. Please return to the app and try again.</p><script>window.location.href="lovetap://payouts";</script></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
