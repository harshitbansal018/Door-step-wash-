import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/roles";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return <LoginForm next={typeof next === "string" ? safeNext(next, "") : ""} notConfigured={error === "not_configured"} />;
}
