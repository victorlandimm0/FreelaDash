import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthBrand } from "@/components/auth-brand";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <AuthBrand />
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Monte seu painel freelancer em minutos.</h1>
        </div>
        <Suspense fallback={null}>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </main>
  );
}
