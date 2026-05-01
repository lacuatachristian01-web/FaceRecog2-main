import { redirect } from "next/navigation";
import { getUserProfile } from "@/services/dashboard";
import { AuthPageContent } from "@/components/auth/auth-page-content";

export default async function LoginPage() {
  const session = await getUserProfile();
  
  if (session?.user) {
    // If it's a student who hasn't registered their face, let them stay to complete enrollment
    if (session.profile?.role === 'student' && !session.profile?.face_registered) {
      // Allow component to handle face registration step
    } else {
      redirect("/dashboard");
    }
  }

  return <AuthPageContent session={session} />;
}
