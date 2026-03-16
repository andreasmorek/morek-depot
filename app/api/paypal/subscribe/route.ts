import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const body = await request.json();
    const { subscriptionId, planId, planName } = body;

    if (!subscriptionId || !planId || !planName) {
      return NextResponse.json(
        { error: "subscriptionId, planId oder planName fehlt" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          paypal_subscription_id: subscriptionId,
          paypal_plan_id: planId,
          plan_name: planName,
          status: "active",
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Abo konnte nicht gespeichert werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}