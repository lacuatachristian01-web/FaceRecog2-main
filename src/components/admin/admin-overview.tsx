"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { 
  DoorOpen, 
  Calendar, 
  Plus, 
  Users, 
  CheckCircle2, 
  FolderKanban,
  LayoutGrid,
  ClipboardCheck,
  Building2,
  TrendingUp,
  Activity,
  ScanFace,
  ChevronRight
} from "lucide-react"
import { getAdminStats } from "@/services/dashboard"

interface AdminOverviewProps {
  onNavigate: (tab: string) => void
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const [stats, setStats] = React.useState<{ students: number, rooms: number, attendanceToday: number } | null>(null)

  React.useEffect(() => {
    async function loadStats() {
      const data = await getAdminStats()
      setStats(data)
    }
    loadStats()
  }, [])

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-12 py-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">System Operational</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-6xl font-black tracking-tighter text-foreground uppercase italic leading-none">
            FRMAS <span className="text-primary">Command</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-[0.1em] uppercase">
            Administrative Control Interface
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full px-4">
        {/* Main Action: Launch New Room + Event */}
        <button 
          onClick={() => onNavigate("rooms")}
          className="md:col-span-12 group focus:outline-none"
        >
          <Card className="relative overflow-hidden bg-card/30 border-border/50 group-hover:border-primary/40 transition-all duration-500 p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl backdrop-blur-xl group-active:scale-[0.99]">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-colors group-hover:bg-primary/10" />
            
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 relative z-10">
              <div className="space-y-2">
                <h3 className="text-4xl font-black tracking-tight text-foreground uppercase italic leading-none">
                  Launch New <br /> <span className="text-primary">Room + Event</span>
                </h3>
                <p className="text-muted-foreground text-base font-medium max-w-sm leading-relaxed">
                  Initialize specific room locations and event designations with biometric security.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                  Get Started
                </div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  {stats?.rooms || 0} Rooms Active
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full opacity-40 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4 text-primary group-hover:scale-110 transition-transform duration-700">
                <DoorOpen className="w-32 h-32 stroke-[1]" />
                <Plus className="w-12 h-12 stroke-[2] absolute top-0 right-0 bg-background rounded-full p-2 border-2 border-primary/20" />
              </div>
            </div>
          </Card>
        </button>

        {/* Secondary Action: Attendance Records */}
        <button 
          onClick={() => onNavigate("logs:list")}
          className="md:col-span-6 group focus:outline-none"
        >
          <Card className="relative overflow-hidden bg-card/30 border-border/50 group-hover:border-primary/40 transition-all duration-500 p-10 rounded-[3.5rem] flex flex-col items-center text-center h-full shadow-xl backdrop-blur-xl group-active:scale-[0.98]">
            <div className="w-20 h-20 rounded-[2rem] bg-secondary/50 flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
               <ClipboardCheck className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-2xl font-black tracking-tight text-foreground uppercase italic">
                Logs & Fines
              </h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">
                Monitor real-time biometric verification logs and oversee student fine management.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50 w-full flex items-center justify-center gap-3">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                 {stats?.attendanceToday || 0} Verified Today
               </span>
            </div>
          </Card>
        </button>

        {/* Secondary Action: Room Registry */}
        <button 
          onClick={() => onNavigate("room_registry")}
          className="md:col-span-6 group focus:outline-none"
        >
          <Card className="relative overflow-hidden bg-card/30 border-border/50 group-hover:border-primary/40 transition-all duration-500 p-10 rounded-[3.5rem] flex flex-col items-center text-center h-full shadow-xl backdrop-blur-xl group-active:scale-[0.98]">
            <div className="w-20 h-20 rounded-[2rem] bg-secondary/50 flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
               <Building2 className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-2xl font-black tracking-tight text-foreground uppercase italic">
                Room Registry
              </h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">
                Oversee all registered students across your active rooms and managed sessions.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50 w-full flex items-center justify-center gap-3">
               <Users className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                 {stats?.students || 0} Total Enrolled
               </span>
            </div>
          </Card>
        </button>

        {/* Terminal Quick Access */}
        <button 
          onClick={() => onNavigate("terminal")}
          className="md:col-span-12 group focus:outline-none mt-6"
        >
          <div className="relative overflow-hidden flex items-center justify-center gap-4 py-8 rounded-[2.5rem] border border-dashed border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all group backdrop-blur-sm">
            <ScanFace className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground group-hover:text-foreground transition-colors">
              Access Biometric Terminal
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>
  )
}
