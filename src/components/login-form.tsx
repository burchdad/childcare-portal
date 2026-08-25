"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const demoUsers = [
  "director@ghostaisolutions.com",
  "auditor@ghostaisolutions.com",
  "jane.smith@ghostaisolutions.com",
];

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          accessCode: form.get("accessCode"),
        }),
      });
      const result = (await response.json().catch(() => ({
        error: "The server returned an empty error response.",
      }))) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Sign in failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Sign in request could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-sm font-medium">
        Email
        <select
          className="h-10 rounded-lg border border-[#d9dfd1] bg-white px-3 outline-none"
          name="email"
        >
          {demoUsers.map((email) => (
            <option key={email}>{email}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Access Code
        <input
          className="h-10 rounded-lg border border-[#d9dfd1] px-3 outline-none"
          defaultValue="demo"
          name="accessCode"
          type="password"
        />
      </label>
      {error ? <p className="text-sm font-medium text-[#a33c2f]">{error}</p> : null}
      <button
        className="h-10 rounded-lg bg-[#224433] px-3 text-sm font-semibold text-white disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
