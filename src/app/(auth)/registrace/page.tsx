import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrace" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card h-80 skeleton" />}>
      <RegisterForm />
    </Suspense>
  );
}
