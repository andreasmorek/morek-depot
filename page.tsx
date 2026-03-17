import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { createClient } from "@/utils/supabase/server";

type PlanType = "free" | "pro" | "investor";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentPlan: PlanType = "free";

  return (
    <main className="min-h-screen bg-[#07112b] text-white">
      <section className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-6 md:py-6">
        <DashboardClient
          userEmail={user.email ?? ""}
          currentPlan={currentPlan}
        />
      </section>
    </main>
  );
}