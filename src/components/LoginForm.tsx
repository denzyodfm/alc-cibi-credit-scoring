"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: form.get("login"), password: form.get("password") })
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid username/email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel p-5">
      <label className="label" htmlFor="login">Username or email</label>
      <input className="input mt-1" id="login" name="login" defaultValue="superadmin" required />
      <label className="label mt-4 block" htmlFor="password">Password</label>
      <input className="input mt-1" id="password" name="password" type="password" defaultValue="Password123!" required />
      {error ? <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <button className="btn-primary mt-5 w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        Default: superadmin / Password123!
      </div>
    </form>
  );
}
