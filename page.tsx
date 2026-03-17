import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { createClient } from "@/utils/supabase/server";

type PlanType = "free" | "starter" | "pro";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let currentPlan: PlanType = "free";

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.plan === "starter" || subscription?.plan === "pro") {
    currentPlan = subscription.plan;
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-6 md:py-6">
        <DashboardClient
          initialUserEmail={user.email ?? ""}
          initialPlanName={currentPlan}
          initialPortfolio={[]}
          initialWatchlist={[]}
        />
      </section>
    </main>
  );
}