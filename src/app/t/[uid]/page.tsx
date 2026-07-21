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
    // 100svh (not vh) so mobile browser chrome doesn't cause a scroll jump;
    // justify-center only once there's room, so short/landscape screens scroll
    // instead of clipping the card.
    <main className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 sm:px-5 py-8 sm:py-10 overflow-x-hidden bg-[#C81E2C]">
      {/* Brand gradient field + soft coral bloom behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg,#E8455A 0%,#D92D3A 42%,#B0121E 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle,rgba(240,113,75,0.85) 0%,rgba(240,113,75,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle,rgba(255,170,120,0.7) 0%,rgba(255,170,120,0) 70%)",
        }}
      />

      <div className="relative w-full max-w-[420px] my-auto">
        <div className="flex justify-center mb-5 sm:mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpeg"
            alt="LoveTap.Me"
            className="h-20 sm:h-24 w-auto rounded-2xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)]"
          />
        </div>
        {children}
      </div>
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
        <div className="bg-white rounded-[28px] p-8 text-center shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] text-[#D92D3A] text-2xl font-bold mx-auto mb-4 flex items-center justify-center">
            !
          </div>
          <h1 className="text-lg font-bold text-[#111827] mb-2">
            This chip isn&apos;t active
          </h1>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            This tag isn&apos;t linked to anyone yet, so we can&apos;t take a tip
            for it. Please let the staff member know.
          </p>
          <p className="text-[11px] text-[#9CA3AF] font-mono mt-5 tracking-wide">
            {decodedUid}
          </p>
        </div>
        <p className="text-center text-xs text-white/70 mt-6">lovetap.me</p>
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
