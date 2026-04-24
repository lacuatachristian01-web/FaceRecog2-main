"use client"

import * as React from "react"
import {
  Database,
  GitBranch,
  Terminal,
  Sparkles,
  User,
  Shield,
  Edit3,
  BookOpen,
  Activity,
  Code2,
  Lock,
  Settings,
  ShieldCheck,
  DoorOpen,
  ClipboardList,
  ScanFace,
  LogIn,
  UserCheck,
  Users
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PillTabs } from "@/components/ui/pill-tabs"
import { siteConfig } from "@/lib/config"
import { ProfileForm } from "./profile-form"
import { useInfiniteQuery } from "@tanstack/react-query"
import { getVibeCheckDataPaginated } from "@/services/dashboard"
import { useInView } from "react-intersection-observer"
import { BentoSkeleton } from "./dashboard/bento-skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { SecurityForm } from "./security-form"
import { RoomList } from "./admin/room-list"
import { JoinRoom } from "./student/join-room"
import { AttendanceTerminal } from "./attendance/attendance-terminal"
import { FaceRegistration } from "./student/face-registration"
import { getStudentRooms } from "@/services/room"
import { getStudentAttendance } from "@/services/attendance"

import { AttendanceLogs } from "./admin/attendance-logs"
import { StudentAttendanceHistory } from "./student/attendance-history"
import { StudentRegistry } from "./admin/student-registry"

const REPOS_PER_PAGE = 5;

function RepoPagination({ repos }: { repos: any[] }) {
  const [page, setPage] = React.useState(0);
  const totalPages = Math.ceil(repos.length / REPOS_PER_PAGE);
  const pageRepos = repos.slice(page * REPOS_PER_PAGE, (page + 1) * REPOS_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Creator description banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-secondary border border-border">
        <GitBranch className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
          These are the public repositories of <span className="text-foreground font-black">Danncode10</span>, the creator of DannFlow.
          To show <span className="text-foreground font-black">your own repos</span>, edit{" "}
          <code className="bg-border px-1.5 py-0.5 rounded text-[10px]">src/lib/config.ts</code> → <code className="bg-border px-1.5 py-0.5 rounded text-[10px]">creatorRepos</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageRepos.map((repo: any, i: number) => (
          <a key={i} href={repo.url} target="_blank" rel="noopener noreferrer" className="block group">
            <Card className="bg-card text-card-foreground border border-border group-hover:border-primary/50 hover:bg-card/80 transition-all duration-300 shadow-sm rounded-3xl h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono text-foreground group-hover:text-primary transition-colors uppercase truncate pr-2">
                  {repo.name}
                </CardTitle>
                <GitBranch className="w-4 h-4 text-muted-foreground group-hover:text-primary/70 shrink-0" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2">
                  "{repo.description || "No mission statement."}"
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Pagination — [<] 1 2 3 [>] */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-black"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-black transition-all border ${
                page === i
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-black"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

interface DashboardShellProps {
  profiles: any[]
  user: any
  profile: any
  repos: any[]
}

export function DashboardShell({ profiles, user, profile, repos }: DashboardShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = profile?.role === 'admin' ? "registry" : "terminal"
  const initialTab = searchParams.get("tab") || defaultTab
  const [activeTab, setActiveTabLocal] = React.useState(initialTab)

  const setActiveTab = (tab: string) => {
    setActiveTabLocal(tab)
    router.push(`/dashboard?tab=${tab}`, { scroll: false })
  }

  const { ref, inView } = useInView()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['profiles-db'],
    queryFn: ({ pageParam = 0 }) => getVibeCheckDataPaginated({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 5 ? allPages.length : undefined,
    initialData: { pages: [profiles], pageParams: [0] }
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const displayProfiles = data?.pages.flat() || profiles;

  const DASHBOARD_TABS = profile?.role === 'admin' 
    ? [
        { id: "registry", label: "Student Users", icon: Users },
        { id: "logs", label: "Attendance & Fines", icon: ClipboardList },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    : [
        { id: "terminal", label: "Attendance Terminal", icon: ScanFace },
      ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <PillTabs items={DASHBOARD_TABS} active={activeTab} onChange={setActiveTab} className="mb-0" />


        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10 gap-1 px-3 py-1">
              <Lock className="w-3 h-3" />
              Admin Mode
            </Badge>
          )}
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
            v1.1.0-alpha
          </Badge>
        </div>
      </div>

      {/* 1. Overview Tab */}
      <TabsContent value="overview" className="space-y-12 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          <Card className="col-span-1 md:col-span-4 bg-card text-card-foreground border border-border shadow-sm hover:scale-[1.01] transition-all group rounded-3xl rounded-tl-xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-tighter">Supabase Engine</CardTitle>
              <Database className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tighter">Active</div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Live Sync: Enabled</p>
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-4 bg-card text-card-foreground border border-border shadow-sm hover:scale-[1.01] transition-all group rounded-3xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-tighter">GitHub Context</CardTitle>
              <GitBranch className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tighter">Indexed</div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Repo: {siteConfig.name}-v2</p>
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-4 bg-card text-card-foreground border border-border shadow-sm hover:scale-[1.01] transition-all group rounded-3xl rounded-tr-xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-tighter">Terminal MCP</CardTitle>
              <Terminal className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tighter">Ready</div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Execution Level: 100%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-10 md:p-14">
            <div className="flex flex-col md:flex-row items-start gap-10">
              <div className="w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tighter">The Software Engineering Edge</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-4xl tracking-tight">
                  "{siteConfig.name} is designed for architects who treat AI as a first-class collaborator. By structuring your project around the <span className="text-foreground font-medium">Trinity Model</span> (DB, Code, Terminal), you reduce cognitive load and maximize throughput. Every file exists for a reason, and every reason is typed."
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border py-1.5 px-4 rounded-full">Modular Architecture</Badge>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border py-1.5 px-4 rounded-full">Type-Safe Services</Badge>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border py-1.5 px-4 rounded-full">AI-Native Workflow</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>



      {/* Admin: Logs Tab */}
      {profile?.role === 'admin' && (
        <TabsContent value="logs" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold text-foreground">Attendance Logs</h2>
            <p className="text-sm text-muted-foreground">View real-time attendance for your rooms.</p>
          </div>
          <AttendanceLogs roomId={profile?.last_room_id || ""} />
        </TabsContent>
      )}

      {/* Admin: Student Registry Tab */}
      {profile?.role === 'admin' && (
        <TabsContent value="registry" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold text-foreground">Student Registry</h2>
            <p className="text-sm text-muted-foreground">Manage student profiles, IDs, and facial registrations.</p>
          </div>
          <StudentRegistry />
        </TabsContent>
      )}

      {/* Student: Terminal Tab */}
      {profile?.role === 'student' && (
        <TabsContent value="terminal" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          {!profile?.face_registered ? (
            <FaceRegistration />
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold text-foreground">Attendance Terminal</h2>
                <p className="text-sm text-muted-foreground">Verify your face to Time In or Time Out.</p>
              </div>
              <AttendanceTerminal 
                roomId={profile?.last_room_id || ""} 
                userId={user.id} 
                userName={profile?.full_name || "Student"} 
              />
            </>
          )}
        </TabsContent>
      )}

      {/* Student: Join Tab */}
      {profile?.role === 'student' && (
        <TabsContent value="join" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <JoinRoom />
        </TabsContent>
      )}

      {/* Student: Status Tab */}
      {profile?.role === 'student' && (
        <TabsContent value="status" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold text-foreground">My Attendance History</h2>
            <p className="text-sm text-muted-foreground">Review your past attendance records and fines.</p>
          </div>
          <StudentAttendanceHistory studentId={user.id} />
        </TabsContent>
      )}

      {/* 5. Security Tab */}
      <TabsContent value="security" className="animate-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-center w-full py-6 md:py-12">
          <Card className="bg-card text-card-foreground border border-border p-6 md:p-12 max-w-2xl w-full shadow-sm rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-accent opacity-30" />
            <SecurityForm />
          </Card>
        </div>
      </TabsContent>

      {/* 6. Settings Tab */}
      <TabsContent value="settings" className="animate-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-center w-full py-6 md:py-12">
          <Card className="bg-card text-card-foreground border border-border p-6 md:p-12 max-w-2xl w-full shadow-sm rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-accent opacity-30" />
            <ProfileForm profile={profile} />
          </Card>
        </div>
      </TabsContent>

    </Tabs>



  )
}
