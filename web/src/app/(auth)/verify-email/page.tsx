import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { safeNext } from "@/lib/roles";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { email, next, sent } = await searchParams;
  return (
    <VerifyEmailForm
      initialEmail={typeof email === "string" ? email : ""}
      next={typeof next === "string" ? safeNext(next, "") : ""}
      justSent={sent === "1"}
    />
  );
}
