import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DashboardShell } from "@/components/dashboard-shell";
import { getUserProfile, getVibeCheckData } from "@/services/dashboard";
import { redirect } from "next/navigation";
import { creatorRepos } from "@/lib/config";

export default async function DashboardPage() {
  const session = await getUserProfile();
  
  if (!session?.user) {
    redirect("/login");
  }

  const { user, profile } = session;
  const profiles = await getVibeCheckData() || [];
  const repos = creatorRepos;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {profile?.role !== 'admin' && <Navbar user={user} />}
      
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-1 flex flex-col ${profile?.role === 'admin' ? 'justify-center py-12' : 'py-10 md:py-20'}`}>
        {profile?.role !== 'admin' && (
          <div className="mb-12">
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic leading-none bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Student Portal
            </h1>
            <p className="mt-2 text-muted-foreground font-semibold italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Welcome back, {profile?.full_name || user.email?.split("@")[0]}. All systems active.
            </p>
          </div>
        )}

        <DashboardShell 
          user={user} 
          profile={profile} 
          profiles={profiles} 
          repos={repos} 
        />
      </main>

      <Footer />
    </div>
  );
}
