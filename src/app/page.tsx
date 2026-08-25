import { ComplianceDashboard } from "@/components/compliance-dashboard";
import { getCurrentUser, primaryRole } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ComplianceDashboard
      currentUser={{
        email: user.email,
        name: user.name,
        role: primaryRole(user),
      }}
    />
  );
}
