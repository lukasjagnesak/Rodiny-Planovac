import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Přihlášení" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card h-72 skeleton" />}>
      <LoginForm />
    </Suspense>
  );
}
