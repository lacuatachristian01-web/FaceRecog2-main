"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { signOut } from "@/services/auth";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, LayoutDashboard, Settings, ChevronDown } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";




const navLinks: any[] = [];

export function Navbar({ user }: { user: any }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/60 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8 relative">
        {/* Centered System Brand Section */}
        <div className="flex items-center gap-4 group transition-all">
          {/* Logo Box */}
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_rgba(108,71,255,0.4)] group-hover:scale-110 transition-transform shrink-0">
            <span className="text-xl font-black text-primary-foreground">F</span>
          </div>

          {/* Text Section */}
          <div className="flex flex-col items-start gap-0">
            <span className="text-base md:text-lg font-black tracking-widest text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase leading-tight">
              {siteConfig.name}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-none mt-1 opacity-60">
              {siteConfig.description}
            </span>
          </div>
        </div>



        {/* User Account Dropdown (Absolute Right) */}
        <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 bg-secondary/30 hover:bg-secondary/50 active:scale-[0.98] transition-all rounded-2xl px-2 py-2 pr-5 border border-border/20 shadow-xl group cursor-pointer">
                <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-lg transition-transform group-hover:rotate-6">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-black text-xs">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start leading-none">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate tracking-tight">
                    {user.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Account</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-2" />
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 mt-4 rounded-2xl shadow-2xl border-border/20 bg-background/95 backdrop-blur-xl p-2">
                <DropdownMenuLabel className="px-3 py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider truncate">
                      {user.email?.split("@")[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-border/20" />
                <DropdownMenuItem onClick={() => router.push("/dashboard")} className="rounded-xl px-3 py-2.5 my-1 hover:bg-primary/10 transition-colors cursor-pointer group">
                  <LayoutDashboard className="mr-3 h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                  <span className="font-bold text-sm">Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard?tab=settings")} className="rounded-xl px-3 py-2.5 my-1 hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <Settings className="mr-3 h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-45" />
                  <span className="font-bold text-sm">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/20" />

                <DropdownMenuItem onClick={handleSignOut} className="rounded-xl px-3 py-2.5 my-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-black uppercase tracking-widest text-[10px]">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <a
                href="/login"
                className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                Sign In
              </a>
              <a
                href="/login"
                className="px-7 py-3 text-sm font-black rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-[0_0_20px_rgba(108,71,255,0.4)] transition-all active:scale-[0.98] uppercase tracking-wider"
              >
                Get Started
              </a>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-secondary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border mt-2">
            {user ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-xl border border-border/20">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black uppercase text-foreground truncate">{user.email?.split("@")[0]}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { router.push("/dashboard"); setMobileOpen(false); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest bg-secondary text-foreground rounded-xl border border-border/20"
                  >
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    Dashboard
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest bg-red-400/10 text-red-400 rounded-xl border border-red-400/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              <a
                href="/login"
                className="block w-full text-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground"
              >
                Get Started
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
