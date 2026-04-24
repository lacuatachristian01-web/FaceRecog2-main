import { redirect } from "next/navigation";
import { getUserProfile } from "@/services/dashboard";
import { AuthPageContent } from "@/components/auth/auth-page-content";

export default async function Home() {
  const session = await getUserProfile();
  
  // If user is already logged in, send them to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // Otherwise, show the login form directly as the "first page"
  return <AuthPageContent />;
}
