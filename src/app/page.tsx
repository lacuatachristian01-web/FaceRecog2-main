import { ArrowRight, Check, Star } from "lucide-react";
import { getUserProfile, getVibeCheckData } from "@/services/dashboard";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FeaturesTabs } from "@/components/features-tabs";
import { siteConfig, creatorRepos } from "@/lib/config";


export default async function Home() {
  const session = await getUserProfile();
  const user = session?.user;
  const profile = session?.profile;
  const profiles = await getVibeCheckData() || [];
  const repos = creatorRepos;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Navbar user={user} />

      {/* =============================
          HERO SECTION
          ============================= */}
      <section
        id="home"
        className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48"
      >
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] animate-pulse [animation-delay:2s]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/10">
            <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Built for builders, by builders
            </span>
          </div>

          <h1 className="mx-auto max-w-5xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground leading-[1.1]">
            Ship Your Next{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent drop-shadow-sm">
              Big Idea
            </span>{" "}
            in Record Time
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            {siteConfig.name} is the AI-native starter template for websites, management
            systems, apps, and startup ideas. Stop building boilerplate — start
            building your vision.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href={user ? "/dashboard" : "/login"}
              className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-2xl bg-primary text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(108,71,255,0.3)] hover:shadow-[0_0_30px_rgba(108,71,255,0.5)]"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-2xl border-2 border-border text-foreground hover:bg-secondary/80 hover:border-muted-foreground/30 transition-all active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              View on GitHub
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <p className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
              Trusted by solo devs and startup teams shipping real products
            </p>
          </div>
        </div>
      </section>

      {/* =============================
          FEATURES SECTION (WITH TABS)
          ============================= */}
      <section id="features" className="relative bg-card/50 border-t border-border/50 py-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(108,71,255,0.05),transparent_50%)]" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              Power Features
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-6">
              Everything you need to launch
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              One template. Every essential built in. Check out our active integrations below.
            </p>
          </div>

          <FeaturesTabs
            profiles={profiles}
            repos={repos}
            currentRole={profile?.role}
          />
        </div>
      </section>

      {/* =============================
          HOW IT WORKS SECTION
          ============================= */}
      <section id="how-it-works" className="bg-background border-t border-border/50 py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-sm font-bold text-primary uppercase tracking-[0.2em]">
              Process
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-black text-foreground tracking-tight">
              Three steps to your next project
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Clone & Configure",
                description:
                  "Fork the repo, add your Supabase credentials to .env.local, and you are live in under 2 minutes.",
              },
              {
                step: "02",
                title: "Describe Your Vision",
                description:
                  "Use feature prompts in src/prompts/features/ to steer your AI. It reads your schema, types, and services automatically.",
              },
              {
                step: "03",
                title: "Ship & Scale",
                description:
                  "Deploy to Vercel with one click. Your checkpoint system ensures you can always roll back safely.",
              },
            ].map((item) => (
              <div key={item.step} className="group relative p-8 rounded-3xl border border-border/50 bg-card/30 hover:bg-card/50 transition-all hover:-translate-y-1">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-black mb-6 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================
          PRICING SECTION
          ============================= */}
      <section id="pricing" className="bg-card/50 border-t border-border/50 py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-sm font-bold text-primary uppercase tracking-[0.2em]">
              Investment
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-black text-foreground tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-6 text-xl text-muted-foreground max-w-xl mx-auto font-medium">
              Start free. Scale when you are ready.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="rounded-3xl border border-border/50 bg-background/50 p-8 flex flex-col hover:border-primary/20 transition-colors">
              <h3 className="text-xl font-bold text-foreground">Starter</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                For solo builders getting started
              </p>
              <div className="mt-8 mb-8">
                <span className="text-5xl font-black text-foreground">$0</span>
                <span className="text-muted-foreground font-medium ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Full starter template",
                  "Supabase auth & database",
                  "Checkpoint system",
                  "Community support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={user ? "/dashboard" : "/login"}
                className="block w-full text-center py-4 rounded-2xl border-2 border-border text-sm font-bold text-foreground hover:bg-secondary transition-all active:scale-[0.98]"
              >
                Get Started
              </a>
            </div>

            {/* Pro — highlighted */}
            <div className="rounded-3xl border-2 border-primary bg-background p-8 flex flex-col relative shadow-[0_0_40px_rgba(108,71,255,0.15)] scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-foreground">Pro</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                For serious builders shipping products
              </p>
              <div className="mt-8 mb-8">
                <span className="text-5xl font-black text-foreground">$29</span>
                <span className="text-muted-foreground font-medium ml-1">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Everything in Starter",
                  "Priority AI support",
                  "Advanced MCP integrations",
                  "Premium templates",
                  "Team collaboration",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={user ? "/dashboard" : "/login"}
                className="block w-full text-center py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:shadow-[0_0_25px_rgba(108,71,255,0.4)] transition-all active:scale-[0.98]"
              >
                Start Free Trial
              </a>
            </div>

            {/* Enterprise */}
            <div className="rounded-3xl border border-border/50 bg-background/50 p-8 flex flex-col hover:border-primary/20 transition-colors">
              <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                For teams and organizations
              </p>
              <div className="mt-8 mb-8">
                <span className="text-5xl font-black text-foreground">Custom</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Everything in Pro",
                  "Dedicated support",
                  "Custom integrations",
                  "SLA guarantee",
                  "White-label options",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="block w-full text-center py-4 rounded-2xl border-2 border-border text-sm font-bold text-foreground hover:bg-secondary transition-all active:scale-[0.98]"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =============================
          CTA BANNER
          ============================= */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.2))]" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-primary-foreground mb-6 tracking-tight">
            Ready to build something great?
          </h2>
          <p className="text-xl text-primary-foreground/90 max-w-xl mx-auto mb-10 font-medium">
            Join builders who use {siteConfig.name} to ship websites, apps, and startup
            MVPs faster than ever.
          </p>
          <a
            href={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-primary-foreground text-primary font-bold hover:shadow-2xl transition-all hover:-translate-y-1 active:scale-[0.98]"
          >
            Start Building Now
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
