import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4 text-[#18211d]">
      <section className="w-full max-w-md rounded-lg border border-[#d9dfd1] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#6b735f]">Ghost AI Solutions</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[#66705f]">Kilgore compliance workspace</p>
        <LoginForm />
      </section>
    </main>
  );
}
