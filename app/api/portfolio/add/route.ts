import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { symbol } = await req.json();

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Ungültiges Symbol" },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      return NextResponse.json(
        { error: "Bitte ein Symbol eingeben" },
        { status: 400 }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let limit = 5;

    if (subscription?.plan_name === "Pro Plan") limit = 25;
    if (subscription?.plan_name === "Investor Plan") limit = 9999;

    const { data: existingPortfolio, error: portfolioError } = await supabase
      .from("portfolio")
      .select("id, symbol")
      .eq("user_id", user.id);

    if (portfolioError) {
      return NextResponse.json(
        { error: "Portfolio konnte nicht geladen werden" },
        { status: 500 }
      );
    }

    const alreadyExists = existingPortfolio?.some(
      (item) => item.symbol === cleanSymbol
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Diese Aktie ist bereits im Depot" },
        { status: 400 }
      );
    }

    if ((existingPortfolio?.length || 0) >= limit) {
      return NextResponse.json(
        { error: "Depot-Limit erreicht – Upgrade erforderlich" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("portfolio").insert({
      user_id: user.id,
      symbol: cleanSymbol,
    });

    if (error) {
      return NextResponse.json(
        { error: "Aktie konnte nicht gespeichert werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolio add error:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}