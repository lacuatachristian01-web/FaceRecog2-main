import { redirect } from "next/navigation";
import { getUserProfile } from "@/services/dashboard";
import { AuthPageContent } from "@/components/auth/auth-page-content";

export default async function LoginPage() {
  const session = await getUserProfile();
  
  if (session?.user) {
    redirect("/dashboard");
  }

  return <AuthPageContent />;
}
