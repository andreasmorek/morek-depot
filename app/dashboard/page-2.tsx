import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "@/components/DashboardClient";

type PlanType = "free" | "pro" | "investor";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let currentPlan: PlanType = "free";

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.plan === "free" ||
    profile?.plan === "pro" ||
    profile?.plan === "investor"
  ) {
    currentPlan = profile.plan;
  }

  return (
    <main className="min-h-screen bg-[#081a4b] text-white">
      <section className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-6 md:py-6">
        <DashboardClient
          userEmail={user.email ?? ""}
          currentPlan={currentPlan}
        />
      </section>
    </main>
  );
}