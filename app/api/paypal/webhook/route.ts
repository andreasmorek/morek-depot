import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PAYPAL_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ENV ${name}`);
  }
  return value;
}

async function getPayPalAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const secret = requiredEnv("PAYPAL_SECRET");

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();

  return data.access_token;
}

async function verifyWebhook(req: NextRequest, body: any) {
  const accessToken = await getPayPalAccessToken();
  const webhookId = requiredEnv("PAYPAL_WEBHOOK_ID");

  const res = await fetch(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: body,
      }),
    }
  );

  const data = await res.json();

  return data.verification_status === "SUCCESS";
}

function supabaseAdmin() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

async function updateSubscription(
  subscriptionId: string,
  values: Record<string, any>
) {
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("profiles")
    .update(values)
    .eq("paypal_subscription_id", subscriptionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const valid = await verifyWebhook(req, body);

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 400 }
      );
    }

    const eventType = body.event_type;
    const subscriptionId = body.resource?.id;

    if (!subscriptionId) {
      return NextResponse.json({ ok: true });
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
        await updateSubscription(subscriptionId, {
          plan: "pro",
          subscription_status: "ACTIVE",
        });
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await updateSubscription(subscriptionId, {
          subscription_status: "CANCELLED",
        });
        break;

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await updateSubscription(subscriptionId, {
          plan: "free",
          subscription_status: "EXPIRED",
        });
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        await updateSubscription(subscriptionId, {
          plan: "free",
          subscription_status: "SUSPENDED",
        });
        break;

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        await updateSubscription(subscriptionId, {
          subscription_status: "PAYMENT_FAILED",
        });
        break;

      default:
        return NextResponse.json({
          ok: true,
          ignored: true,
          event: eventType,
        });
    }

    return NextResponse.json({
      ok: true,
      event: eventType,
      subscriptionId,
    });
  } catch (error: any) {
    console.error("PayPal webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}