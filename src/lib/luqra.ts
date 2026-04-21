// Luqra PayFac API Client
// TODO: Replace placeholder endpoints with actual Luqra API URLs when documentation is available

const LUQRA_API_BASE = "https://api.luqra.com/v1";
const LUQRA_SECRET_KEY = process.env.LUQRA_SECRET_KEY!;

interface LuqraRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
}

async function luqraRequest<T = unknown>(
  endpoint: string,
  options: LuqraRequestOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const response = await fetch(`${LUQRA_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${LUQRA_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Luqra API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

// --- Payment Intents ---

export const paymentIntents = {
  create: (params: {
    amount: number;
    currency: string;
    automatic_payment_methods?: { enabled: boolean };
    metadata?: Record<string, string>;
  }) =>
    luqraRequest<LuqraPaymentIntent>("/payment-intents", {
      method: "POST",
      body: params,
    }),

  retrieve: (id: string) =>
    luqraRequest<LuqraPaymentIntent>(`/payment-intents/${id}`),
};

// --- Merchant Accounts (replaces Stripe Connect) ---

export const merchantAccounts = {
  create: (params: {
    type: string;
    email: string;
    metadata?: Record<string, string>;
    capabilities?: Record<string, { requested: boolean }>;
  }) =>
    luqraRequest<LuqraMerchantAccount>("/merchant-accounts", {
      method: "POST",
      body: params,
    }),

  retrieve: (id: string) =>
    luqraRequest<LuqraMerchantAccount>(`/merchant-accounts/${id}`),
};

// --- Merchant Onboarding Links (replaces Stripe Account Links) ---

export const merchantOnboardingLinks = {
  create: (params: {
    merchant_account: string;
    refresh_url: string;
    return_url: string;
    type: string;
  }) =>
    luqraRequest<{ url: string }>("/merchant-onboarding-links", {
      method: "POST",
      body: params,
    }),
};

// --- Transfers ---

export const transfers = {
  create: (params: {
    amount: number;
    currency: string;
    destination: string;
    metadata?: Record<string, string>;
  }) =>
    luqraRequest<LuqraTransfer>("/transfers", {
      method: "POST",
      body: params,
    }),
};

// --- Webhook Signature Verification ---

export const webhooks = {
  constructEvent: (
    body: string,
    _signature: string,
    _secret: string
  ): LuqraWebhookEvent => {
    // TODO: Replace with actual Luqra HMAC verification when API docs are available
    const payload = JSON.parse(body);
    return payload as LuqraWebhookEvent;
  },
};

// --- Types ---

export interface LuqraWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface LuqraPaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface LuqraMerchantAccount {
  id: string;
  email: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  metadata: Record<string, string>;
}

export interface LuqraTransfer {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  reversed: boolean;
  metadata: Record<string, string>;
}
