import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import TipFlow from "./tip-flow";

// Public, no-login tip page. This is the URL that gets programmed onto the
// physical NFC chips: https://<domain>/t/<chipUid>
//
// A tipper taps the chip with any phone, the browser opens this page, and they
// can pay without installing anything. The chip code in the URL is what
// identifies the recipient.

export const dynamic = "force-dynamic";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  await connectDB();
  const chip = await NfcChip.findOne({
    chipUid: new RegExp(`^${escapeRegex(decodeURIComponent(uid).trim())}$`, "i"),
    status: "active",
  }).lean<{ customerName?: string } | null>();

  const name = chip?.customerName;
  return {
    title: name ? `Tip ${name} · lovetap.me` : "lovetap.me",
    description: name
      ? `Send ${name} a tip with your card. No app required.`
      : "Tap. Tip. Done.",
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

export default async function TipPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const decodedUid = decodeURIComponent(uid).trim();

  await connectDB();
  const chip = await NfcChip.findOne({
    chipUid: new RegExp(`^${escapeRegex(decodedUid)}$`, "i"),
    status: "active",
  }).lean<{
    chipUid: string;
    customerId?: unknown;
    customerName?: string;
  } | null>();

  // Unknown code, disabled chip, or a chip nobody has claimed yet. Keep the
  // message generic — a tipper can't fix any of these, they just need to know
  // not to keep tapping.
  if (!chip || !chip.customerId) {
    return (
      <Shell>
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-danger-light text-danger text-2xl font-bold mx-auto mb-4 flex items-center justify-center">
            !
          </div>
          <h1 className="text-lg font-bold mb-2">This chip isn&apos;t active</h1>
          <p className="text-sm text-muted leading-relaxed">
            This tag isn&apos;t linked to anyone yet, so we can&apos;t take a tip
            for it. Please let the staff member know.
          </p>
          <p className="text-[11px] text-muted/70 font-mono mt-5">{decodedUid}</p>
        </div>
        <p className="text-center text-xs text-muted mt-6">lovetap.me</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <TipFlow
        chipUid={chip.chipUid}
        recipientName={chip.customerName || "your server"}
      />
    </Shell>
  );
}
