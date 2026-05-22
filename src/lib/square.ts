import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const environment = process.env.SQUARE_ENVIRONMENT === "production"
  ? SquareEnvironment.Production
  : SquareEnvironment.Sandbox;

if (!accessToken) {
  throw new Error("SQUARE_ACCESS_TOKEN env var is required");
}

export const squareClient = new SquareClient({
  token: accessToken,
  environment,
});

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID!;
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!;
export const SQUARE_WEBHOOK_NOTIFICATION_URL = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL!;

export async function verifySquareWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY || !SQUARE_WEBHOOK_NOTIFICATION_URL) {
    console.error(
      "SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL not configured"
    );
    return false;
  }
  return WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey: SQUARE_WEBHOOK_SIGNATURE_KEY,
    notificationUrl: SQUARE_WEBHOOK_NOTIFICATION_URL,
  });
}

export interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
}
