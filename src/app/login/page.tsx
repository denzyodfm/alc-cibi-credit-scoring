import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <main className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="text-sm font-bold uppercase tracking-wide text-alc-green">Agusan Lending Corporation</div>
            <h1 className="mt-3 text-3xl font-bold text-ink">CI/BI and Credit Scorecard System</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Secure branch-tagged loan investigation, 5C scoring, and credit committee routing.</p>
          </div>
          <LoginForm />
          <p className="mt-5 text-xs text-slate-500">Forgot password is a placeholder in this first version. Ask a system administrator to reset access.</p>
        </div>
      </section>
      <section className="hidden bg-[linear-gradient(135deg,#0f766e,#1d4ed8)] p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="max-w-lg">
          <div className="text-5xl font-bold">5C</div>
          <p className="mt-4 text-lg leading-8 text-white/88">Character, Capacity, Capital, Collateral, and Conditions computed with configurable weights and server-side validation.</p>
        </div>
      </section>
    </main>
  );
}
