import { SignupForm } from "@/components/auth/signup-form";
import { safeNext } from "@/lib/roles";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <SignupForm next={typeof next === "string" ? safeNext(next, "") : ""} />;
}
