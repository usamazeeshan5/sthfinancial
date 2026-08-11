"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web version of the mobile tipper flow: pick amount -> review fee -> card ->
// result. Reuses the same backend the app does (/api/mobile/tip/*), so quotes,
// fees and direct-to-seller Square settlement behave identically.

type Step = "amount" | "card" | "success";

interface Quote {
  quoteId: string;
  amount: number;
  fee: number;
  totalCharged: number;
  percentageFee: number;
  flatFee: number;
  customerName: string;
  square: {
    applicationId: string | null;
    locationId: string | null;
    environment: string;
  };
}

interface Props {
  chipUid: string;
  recipientName: string;
}

const PRESETS = [5, 10, 20, 50];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Square?: any;
  }
}

const money = (n: number) => `$${n.toFixed(2)}`;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function loadSquareSdk(environment: string): Promise<any> {
  const url =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  return new Promise((resolve, reject) => {
    if (window.Square) return resolve(window.Square);

    const done = () =>
      window.Square
        ? resolve(window.Square)
        : reject(new Error("Square failed to initialize."));

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`
    );
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () =>
        reject(new Error("Couldn't load the secure card form."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = done;
    script.onerror = () =>
      reject(new Error("Couldn't load the secure card form."));
    document.head.appendChild(script);
  });
}

export default function TipFlow({ chipUid, recipientName }: Props) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(0);
  const [custom, setCustom] = useState("");
  const [rates, setRates] = useState<{
    platformPercentageFee: number;
    platformFlatFee: number;
  } | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const [applePayReady, setApplePayReady] = useState(false);

  const cardRef = useRef<any>(null);
  const googlePayRef = useRef<any>(null);
  const applePayRef = useRef<any>(null);
  const attachedRef = useRef(false);

  // Live platform-fee config so the estimate matches the server's gross-up
  // quote (admin can change it at any time). The estimate mirrors the
  // server-side gross-up in lib/feeMath.ts.
  useEffect(() => {
    fetch("/api/fees")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d)
          setRates({
            platformPercentageFee: d.platformPercentageFee || 0,
            platformFlatFee: d.platformFlatFee || 0,
          });
      })
      .catch(() => {
        /* estimate is optional — the quote screen shows the real number */
      });
  }, []);

  // Mirror of lib/feeMath.ts (kept in sync): worker nets exactly the tip.
  const SQUARE_PERCENT = 0.029;
  const SQUARE_FIXED_CENTS = 30;
  const estimate = (() => {
    if (!rates || amount <= 0) return { fee: null as number | null, total: null as number | null };
    const tipCents = Math.round(amount * 100);
    const appFeeCents =
      Math.round(tipCents * (rates.platformPercentageFee / 100)) +
      Math.round(rates.platformFlatFee * 100);
    const totalCents = Math.ceil(
      (tipCents + SQUARE_FIXED_CENTS + Math.max(0, appFeeCents)) / (1 - SQUARE_PERCENT)
    );
    return { fee: (totalCents - tipCents) / 100, total: totalCents / 100 };
  })();
  const estFee = estimate.fee;
  const estTotal = estimate.total;

  const pickPreset = (v: number) => {
    setAmount(v);
    setCustom("");
    setError(null);
  };

  const onCustom = (raw: string) => {
    // Keep it to a sane money string: digits + at most one decimal point.
    const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    setCustom(cleaned);
    const parsed = parseFloat(cleaned);
    setAmount(isNaN(parsed) ? 0 : parsed);
    setError(null);
  };

  const startPayment = async () => {
    if (amount <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mobile/tip/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chipUid, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't start the payment.");
      if (!data.square?.applicationId || !data.square?.locationId) {
        throw new Error("Card payments aren't configured for this recipient yet.");
      }
      setQuote(data as Quote);
      setStep("card");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // Mount Square's card fields + digital wallets (Google Pay / Apple Pay) once
  // we're on the card step. Wallets are best-effort: if a device/browser doesn't
  // support one (or Apple Pay's domain isn't registered), it's silently skipped
  // and the card form still works.
  useEffect(() => {
    if (step !== "card" || !quote || attachedRef.current) return;
    attachedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const Square = await loadSquareSdk(quote.square.environment);
        if (cancelled) return;
        const payments = Square.payments(
          quote.square.applicationId,
          quote.square.locationId
        );

        // Card
        const card = await payments.card({
          style: {
            input: { fontSize: "16px", color: "#111827" },
            ".input-container": { borderRadius: "14px", borderColor: "#E5E7EB" },
            ".input-container.is-focus": { borderColor: "#E23744" },
            ".input-container.is-error": { borderColor: "#DC2626" },
            ".message-text.is-error": { color: "#DC2626" },
          },
        });
        if (cancelled) return;
        await card.attach("#card-container");
        cardRef.current = card;
        setCardReady(true);

        // A payment request describing the amount, shared by both wallets.
        const buildPaymentRequest = () =>
          payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: { amount: quote.totalCharged.toFixed(2), label: "LoveTap tip" },
          });

        // Google Pay (Chrome / Android)
        try {
          console.log("[LoveTap] init Google Pay · location:", quote.square.locationId, "· env:", quote.square.environment);
          const gp = await payments.googlePay(buildPaymentRequest());
          await gp.attach("#gpay-container", {
            buttonColor: "black",
            buttonType: "short",
            buttonSizeMode: "fill",
          });
          const el = document.getElementById("gpay-container");
          console.log("[LoveTap] Google Pay attached · button rendered:", !!el && el.childElementCount > 0);
          if (!cancelled) {
            googlePayRef.current = gp;
            setGooglePayReady(true);
          }
        } catch (e) {
          console.warn("[LoveTap] Google Pay unavailable:", e);
        }

        // Apple Pay (Safari / iOS, requires the domain registered with Square)
        try {
          const ap = await payments.applePay(buildPaymentRequest());
          if (!cancelled) {
            applePayRef.current = ap;
            setApplePayReady(true);
          }
        } catch (e) {
          console.warn("[LoveTap] Apple Pay unavailable:", e);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Couldn't load the payment form.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, quote]);

  // Sends a tokenized payment (from card or a wallet) to the charge endpoint.
  const chargeWithToken = useCallback(
    async (sourceId: string) => {
      if (!quote) return;
      const res = await fetch("/api/mobile/tip/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId, sourceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Payment failed. Please try again.");
      }
      setStep("success");
    },
    [quote]
  );

  const pay = useCallback(async () => {
    if (!cardRef.current || !quote || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK") {
        const detail = result.errors?.[0]?.message;
        throw new Error(detail || "Please check your card details.");
      }
      await chargeWithToken(result.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }, [quote, busy, chargeWithToken]);

  // Pay with a digital wallet (Google Pay / Apple Pay).
  const payWithWallet = useCallback(
    async (wallet: "google" | "apple") => {
      const ref = wallet === "google" ? googlePayRef.current : applePayRef.current;
      if (!ref || !quote || busy) return;
      setBusy(true);
      setError(null);
      try {
        const result = await ref.tokenize();
        if (result.status !== "OK") {
          // A cancelled wallet sheet isn't an error worth showing.
          if (result.status === "Cancel") return;
          throw new Error(result.errors?.[0]?.message || "Wallet payment failed.");
        }
        await chargeWithToken(result.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet payment failed.");
      } finally {
        setBusy(false);
      }
    },
    [quote, busy, chargeWithToken]
  );

  /* ---------------- success ---------------- */
  if (step === "success" && quote) {
    return (
      <>
        <Card>
          <div className="px-5 sm:px-7 pt-8 sm:pt-9 pb-7 sm:pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] mx-auto mb-5 flex items-center justify-center ring-8 ring-[#ECFDF5]/60">
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-[#059669]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#111827]">
              Thank you!
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-2 leading-relaxed">
              Your <span className="font-semibold text-[#111827]">
                {money(quote.amount)}
              </span>{" "}
              tip is on its way to {quote.customerName}.
            </p>

            <div className="mt-7 rounded-2xl bg-[#F9FAFB] border border-[#F0F1F3] p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4C8CE] mb-2">
                Receipt
              </p>
              <Row label="Tip" value={money(quote.amount)} />
              <Row label="LoveTap service fee" value={money(quote.fee)} />
              <Divider />
              <Row label="Total charged" value={money(quote.totalCharged)} bold />
              <p className="text-[11px] text-[#9CA3AF] mt-3 font-mono break-all">
                Ref: {quote.quoteId}
              </p>
            </div>

            <p className="text-xs text-[#9CA3AF] mt-6 leading-relaxed">
              This is your receipt — save or screenshot it for your records.
              For refund or cancellation requests, contact the LoveTap recipient
              or support with the reference above.
            </p>
          </div>
        </Card>
        <Footer />
      </>
    );
  }

  /* ---------------- card ---------------- */
  if (step === "card" && quote) {
    return (
      <>
        <Card>
          <Hero name={quote.customerName || recipientName} />

          <div className="px-5 sm:px-7 pb-6 sm:pb-7">
            <div className="rounded-2xl bg-[#F9FAFB] border border-[#F0F1F3] p-4">
              <Row label="Tip" value={money(quote.amount)} />
              <Row
                label="LoveTap service fee"
                value={money(quote.fee)}
              />
              <Divider />
              <Row label="You pay" value={money(quote.totalCharged)} bold />
            </div>

            <p className="text-xs text-[#6B7280] mt-3 text-center">
              {quote.customerName} receives the full{" "}
              <span className="font-semibold text-[#111827]">
                {money(quote.amount)}
              </span>
              .
            </p>

            {/* Digital wallets (Google Pay / Apple Pay) — shown only when the
                device/browser supports them. */}
            {(googlePayReady || applePayReady) && (
              <div className="mt-6 space-y-2.5">
                {applePayReady && (
                  <button
                    onClick={() => payWithWallet("apple")}
                    disabled={busy}
                    aria-label="Pay with Apple Pay"
                    className="w-full h-[48px] rounded-xl bg-black text-white text-[15px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span style={{ fontSize: 18 }}></span> Pay
                  </button>
                )}
                {/* Square renders the Google Pay button inside this container;
                    the click bridges to tokenize + charge. */}
                {googlePayReady && (
                  <div
                    id="gpay-container"
                    onClick={() => !busy && payWithWallet("google")}
                    className="w-full min-h-[48px] [&>*]:w-full"
                  />
                )}
                <div className="relative flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-[#EDEFF2]" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#C4C8CE]">
                    or pay by card
                  </span>
                  <div className="h-px flex-1 bg-[#EDEFF2]" />
                </div>
              </div>
            )}

            <div className="mt-6">
              <div id="card-container" className="min-h-[100px]" />
              {!cardReady && !error && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <Spinner />
                  Loading secure payment form…
                </div>
              )}
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <PrimaryButton
              onClick={pay}
              disabled={!cardReady || busy}
              busy={busy}
            >
              {busy ? "Processing…" : `Pay ${money(quote.totalCharged)}`}
            </PrimaryButton>

            <button
              onClick={() => {
                setStep("amount");
                setQuote(null);
                setError(null);
                setCardReady(false);
                attachedRef.current = false;
                cardRef.current = null;
              }}
              disabled={busy}
              className="w-full mt-2.5 py-2 text-sm font-semibold text-[#9CA3AF] hover:text-[#6B7280] transition-colors disabled:opacity-50"
            >
              Change amount
            </button>

            <p className="text-[11px] text-[#9CA3AF] text-center mt-3 leading-relaxed">
              By paying you agree this tip is a one-time charge. Refunds and
              cancellations are handled through the recipient or LoveTap support.
              Card details are processed securely by Square.
            </p>
          </div>
        </Card>
        <Footer />
      </>
    );
  }

  /* ---------------- amount ---------------- */
  return (
    <>
      <Card>
        <Hero name={recipientName} />

        <div className="px-5 sm:px-7 pb-6 sm:pb-7">
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {PRESETS.map((v) => {
              const active = amount === v && !custom;
              return (
                <button
                  key={v}
                  onClick={() => pickPreset(v)}
                  className={`h-[50px] sm:h-[52px] rounded-xl sm:rounded-2xl text-sm sm:text-[15px] font-bold transition-all active:scale-95 ${
                    active
                      ? "bg-gradient-to-b from-[#F0714B] to-[#E23744] text-white shadow-lg shadow-[#E23744]/25"
                      : "bg-[#F9FAFB] text-[#111827] border border-[#EDEFF2] hover:border-[#F0714B]/50 hover:bg-white"
                  }`}
                >
                  ${v}
                </button>
              );
            })}
          </div>

          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#F0F1F3]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#C4C8CE]">
              or
            </span>
            <div className="h-px flex-1 bg-[#F0F1F3]" />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-bold text-[#C4C8CE] pointer-events-none">
              $
            </span>
            <input
              value={custom}
              onChange={(e) => onCustom(e.target.value)}
              inputMode="decimal"
              placeholder="Enter amount"
              className="w-full h-[52px] pl-9 pr-4 bg-[#F9FAFB] border border-[#EDEFF2] rounded-2xl text-[17px] font-bold text-[#111827] placeholder:font-medium placeholder:text-[#C4C8CE] focus:outline-none focus:border-[#E23744] focus:bg-white focus:ring-4 focus:ring-[#E23744]/10 transition-all"
            />
          </div>

          {amount > 0 && estTotal !== null && (
            <div className="mt-4 rounded-2xl bg-[#FFF7F5] border border-[#FBE3DB] p-4">
              <Row label="Tip" value={money(amount)} />
              <Row label="LoveTap service fee" value={money(estFee!)} />
              <Divider tone="warm" />
              <Row label="You pay" value={money(estTotal)} bold />
            </div>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}

          <PrimaryButton
            onClick={startPayment}
            disabled={amount <= 0 || busy}
            busy={busy}
          >
            {busy
              ? "Please wait…"
              : amount > 0
              ? `Tip ${money(amount)}`
              : "Enter an amount"}
          </PrimaryButton>

          <p className="text-[11px] text-[#9CA3AF] text-center mt-3">
            No app or account needed.
          </p>
        </div>
      </Card>
      <Footer />
    </>
  );
}

/* ---------------- presentational bits ---------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl sm:rounded-[28px] overflow-hidden shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]">
      {children}
    </div>
  );
}

function Hero({ name }: { name: string }) {
  return (
    <div className="px-5 sm:px-7 pt-7 sm:pt-8 pb-5 sm:pb-6 text-center">
      <div className="w-[60px] h-[60px] rounded-full mx-auto mb-4 flex items-center justify-center text-white text-[19px] font-extrabold tracking-wide bg-gradient-to-br from-[#F0714B] to-[#E23744] shadow-lg shadow-[#E23744]/25">
        {initials(name)}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4C8CE]">
        You&apos;re tipping
      </p>
      <h1 className="text-[22px] sm:text-[27px] leading-tight font-extrabold tracking-tight text-[#111827] mt-1.5 break-words">
        {name}
      </h1>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-[54px] mt-5 rounded-2xl text-white text-[16px] font-bold bg-gradient-to-b from-[#F0714B] to-[#E23744] shadow-lg shadow-[#E23744]/30 transition-all active:scale-[0.98] enabled:hover:brightness-105 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
    >
      {busy && <Spinner light />}
      {children}
    </button>
  );
}

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin ${
        light ? "text-white/80" : "text-[#C4C8CE]"
      }`}
    />
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C] leading-relaxed">
      {children}
    </div>
  );
}

function Divider({ tone }: { tone?: "warm" }) {
  return (
    <div
      className={`my-2.5 h-px ${tone === "warm" ? "bg-[#FBE3DB]" : "bg-[#EDEFF2]"}`}
    />
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span
        className={
          bold
            ? "text-[15px] font-bold text-[#111827]"
            : "text-[14px] text-[#6B7280]"
        }
      >
        {label}
      </span>
      <span
        className={
          bold
            ? "text-[17px] font-extrabold text-[#111827] tabular-nums"
            : "text-[14px] font-semibold text-[#111827] tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Footer() {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-5">
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 text-white/70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <p className="text-xs font-medium text-white/70">
        Secured by Square · lovetap.me
      </p>
    </div>
  );
}
