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
    percentageFee: number;
    flatFee: number;
  } | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);

  const cardRef = useRef<any>(null);
  const attachedRef = useRef(false);

  // Live fee rates so the estimate matches what the server will actually
  // quote (the admin can change these at any time).
  useEffect(() => {
    fetch("/api/fees")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setRates({ percentageFee: d.percentageFee, flatFee: d.flatFee });
      })
      .catch(() => {
        /* estimate is optional — the quote screen shows the real number */
      });
  }, []);

  const estFee =
    rates && amount > 0
      ? Math.round((amount * (rates.percentageFee / 100) + rates.flatFee) * 100) /
        100
      : null;
  const estTotal = estFee !== null ? Math.round((amount + estFee) * 100) / 100 : null;

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
        throw new Error(
          "Card payments aren't configured for this recipient yet."
        );
      }
      setQuote(data as Quote);
      setStep("card");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // Mount Square's hosted card fields once we're on the card step.
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
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#card-container");
        cardRef.current = card;
        setCardReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Couldn't load the card form."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, quote]);

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

      const res = await fetch("/api/mobile/tip/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId, sourceId: result.token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Payment failed. Please try again.");
      }
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }, [quote, busy]);

  /* ---------------- success ---------------- */
  if (step === "success" && quote) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-success-light text-success text-3xl font-bold mx-auto mb-5 flex items-center justify-center">
          ✓
        </div>
        <h1 className="text-xl font-extrabold mb-1">Thank you!</h1>
        <p className="text-sm text-muted mb-6">
          Your {money(quote.amount)} tip is on its way to {quote.customerName}.
        </p>
        <div className="bg-background border border-border rounded-xl p-4 text-sm space-y-2">
          <Row label="Tip" value={money(quote.amount)} />
          <Row label="Processing fee" value={money(quote.fee)} />
          <div className="border-t border-border pt-2">
            <Row label="Total charged" value={money(quote.totalCharged)} bold />
          </div>
        </div>
        <p className="text-xs text-muted mt-6">
          A receipt was sent to your card issuer. You can close this page.
        </p>
      </div>
    );
  }

  /* ---------------- card ---------------- */
  if (step === "card" && quote) {
    return (
      <div>
        <Header name={quote.customerName || recipientName} />

        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="text-sm space-y-2">
            <Row label="Tip" value={money(quote.amount)} />
            <Row
              label={`Processing fee (${quote.percentageFee}% + ${money(
                quote.flatFee
              )})`}
              value={money(quote.fee)}
            />
            <div className="border-t border-border pt-2">
              <Row label="You pay" value={money(quote.totalCharged)} bold />
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            {quote.customerName} receives the full {money(quote.amount)}.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div id="card-container" className="min-h-[110px]" />
          {!cardReady && !error && (
            <p className="text-sm text-muted text-center py-4">
              Loading secure card form…
            </p>
          )}

          {error && (
            <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-xl p-3 mt-3">
              {error}
            </div>
          )}

          <button
            onClick={pay}
            disabled={!cardReady || busy}
            className="w-full mt-4 py-3.5 rounded-xl bg-accent text-white font-bold disabled:opacity-50 transition-opacity"
          >
            {busy ? "Processing…" : `Pay ${money(quote.totalCharged)}`}
          </button>

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
            className="w-full mt-2 py-2 text-sm text-muted font-medium disabled:opacity-50"
          >
            Change amount
          </button>

          <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">
            Card details go straight to Square. lovetap.me never sees your card
            number.
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Secured by Square · lovetap.me
        </p>
      </div>
    );
  }

  /* ---------------- amount ---------------- */
  return (
    <div>
      <Header name={recipientName} />

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3">Choose a tip</p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => pickPreset(v)}
              className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                amount === v && !custom
                  ? "bg-accent border-accent text-white"
                  : "bg-background border-border text-foreground hover:border-accent/40"
              }`}
            >
              ${v}
            </button>
          ))}
        </div>

        <label className="block text-sm font-semibold mb-2">Or enter an amount</label>
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">
            $
          </span>
          <input
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        {amount > 0 && estTotal !== null && (
          <div className="bg-background border border-border rounded-xl p-4 text-sm space-y-2 mb-4">
            <Row label="Tip" value={money(amount)} />
            <Row label="Processing fee" value={money(estFee!)} />
            <div className="border-t border-border pt-2">
              <Row label="You pay" value={money(estTotal)} bold />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={startPayment}
          disabled={amount <= 0 || busy}
          className="w-full py-3.5 rounded-xl bg-accent text-white font-bold disabled:opacity-50 transition-opacity"
        >
          {busy ? "Please wait…" : amount > 0 ? `Tip ${money(amount)}` : "Enter an amount"}
        </button>

        <p className="text-[11px] text-muted text-center mt-3">
          No app or account needed.
        </p>
      </div>

      <p className="text-center text-xs text-muted mt-6">
        Secured by Square · lovetap.me
      </p>
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <div className="text-center mb-6">
      <p className="text-sm text-muted">You&apos;re tipping</p>
      <h1 className="text-2xl font-extrabold mt-1">{name}</h1>
    </div>
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
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold" : "text-muted"}>{label}</span>
      <span className={bold ? "font-extrabold" : "font-semibold"}>{value}</span>
    </div>
  );
}
