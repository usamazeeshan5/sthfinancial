export const metadata = {
  title: "LoveTap.Me — My Account",
};

// Brand gradient shell shared by all worker-portal pages.
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-[100svh] flex flex-col items-center px-4 sm:px-5 py-8 sm:py-10 overflow-x-hidden bg-[#C81E2C]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(165deg,#E8455A 0%,#D92D3A 42%,#B0121E 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle,rgba(240,113,75,0.85) 0%,rgba(240,113,75,0) 70%)" }}
      />
      <div className="relative w-full max-w-[460px] my-auto">
        <div className="flex justify-center mb-5 sm:mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpeg"
            alt="LoveTap.Me"
            className="h-16 sm:h-20 w-auto rounded-2xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)]"
          />
        </div>
        {children}
      </div>
    </main>
  );
}
