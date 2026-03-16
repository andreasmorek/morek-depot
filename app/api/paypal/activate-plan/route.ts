import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_PLANS = new Set(["free", "pro", "investor"]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Nicht eingeloggt" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = String(body?.plan ?? "").toLowerCase().trim();
    const subscriptionId = String(body?.subscriptionId ?? "").trim();

    if (!ALLOWED_PLANS.has(plan)) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Plan" },
        { status: 400 }
      );
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { ok: false, error: "subscriptionId fehlt" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          plan,
          paypal_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      plan,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}