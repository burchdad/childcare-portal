import Link from "next/link";
import { redirect } from "next/navigation";
import { ManageWorkspace } from "@/components/manage-workspace";
import { canManageEmployees, getCurrentUser, primaryRole } from "@/lib/server/auth";

export default async function ManagePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageEmployees(user) && !user.roles.includes("AUDITOR")) {
    redirect(user.employeeId ? `/employees/${user.employeeId}` : "/");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18211d]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 border-b border-[#d9dfd1] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="text-sm font-semibold text-[#224433]" href="/">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Manage</h1>
            <p className="mt-1 text-sm text-[#66705f]">
              Back-office tools for employee, training, document, import, and compliance rule records
            </p>
          </div>
          <div className="rounded-lg border border-[#d9dfd1] bg-white px-3 py-2 text-sm shadow-sm">
            <span className="font-semibold">{user.name}</span>
            <span className="ml-2 text-[#66705f]">{primaryRole(user).replaceAll("_", " ")}</span>
          </div>
        </div>
        <ManageWorkspace canEdit={!user.roles.includes("AUDITOR")} />
      </div>
    </main>
  );
}
