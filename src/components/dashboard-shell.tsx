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
  const defaultTab = profile?.role === 'admin' ? "rooms" : "status"
  const initialTab = searchParams.get("tab") || defaultTab
  const [activeTab, setActiveTabLocal] = React.useState(initialTab)
  const [isRegisteringPhoto, setIsRegisteringPhoto] = React.useState(false)
  const [registrationMode, setRegistrationMode] = React.useState<'camera' | 'upload' | null>(null)
  const [initialImageData, setInitialImageData] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
        { id: "rooms", label: "Rooms & Sessions", icon: DoorOpen },
        { id: "terminal", label: "Attendance Terminal", icon: ScanFace },
        { id: "registry", label: "Student Users", icon: Users },
        { id: "logs", label: "Attendance & Fines", icon: ClipboardList },
        { id: "settings", label: "Profile", icon: User },
      ]
    : [
        { id: "status", label: "Dashboard", icon: Activity },
        { id: "join", label: "Join to other room", icon: LogIn },
      ];

  // Hide navigation if student is not registered or hasn't joined a room yet
  const showTabs = profile?.role === 'admin' || (profile?.face_registered && profile?.last_room_id);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          {showTabs && (
            <PillTabs items={DASHBOARD_TABS} active={activeTab} onChange={setActiveTab} className="mb-0" />
          )}

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

        {/* Admin: Rooms Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="rooms" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Room Management</h2>
              <p className="text-sm text-muted-foreground">Create rooms and generate codes for students.</p>
            </div>
            <RoomList />
          </TabsContent>
        ) : null}

        {/* Admin: Logs Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="logs" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Attendance Logs</h2>
              <p className="text-sm text-muted-foreground">View real-time attendance and fines.</p>
            </div>
            <AttendanceLogs roomId={profile?.last_room_id || ""} />
          </TabsContent>
        ) : null}

        {/* Admin: Student Registry Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="registry" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Student Registry</h2>
              <p className="text-sm text-muted-foreground">Manage all registered students and their access.</p>
            </div>
            <StudentRegistry />
          </TabsContent>
        ) : null}

        {/* Admin: Terminal Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="terminal" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Attendance Terminal</h2>
              <p className="text-sm text-muted-foreground">Global biometric scanner for real-time attendance.</p>
            </div>
            <AttendanceTerminal 
              roomId={profile?.last_room_id || ""} 
              userId={user.id}
              userName={profile?.full_name || "Administrator"}
              isGlobal 
            />
          </TabsContent>
        ) : null}

        {/* 5. Status/Dashboard Tab (Student) */}
        {profile?.role === 'student' ? (
          <TabsContent value="status" className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            {(!profile?.face_registered || isRegisteringPhoto) ? (
              <div className="space-y-6">
                {isRegisteringPhoto && (
                  <button 
                    onClick={() => setIsRegisteringPhoto(false)}
                    className="text-xs font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-colors"
                  >
                    ← Back to Dashboard
                  </button>
                )}
                <FaceRegistration 
                  onSuccess={() => {
                    setIsRegisteringPhoto(false);
                    setInitialImageData(null);
                  }} 
                  initialMode={registrationMode}
                  initialImage={initialImageData}
                  isReplacing={!!profile?.face_image}
                />
              </div>
            ) : !profile?.last_room_id ? (
              <div className="space-y-6">
                <JoinRoom />
              </div>
            ) : (
              <StudentAttendanceHistory 
                studentId={user.id} 
                profile={profile} 
                onUpdateFace={(mode) => {
                  if (mode === 'upload') {
                    fileInputRef.current?.click();
                  } else {
                    setRegistrationMode('camera');
                    setInitialImageData(null);
                    setIsRegisteringPhoto(true);
                  }
                }}
              />
            )}
          </TabsContent>
        ) : null}

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

      {/* Hidden File Input for instant dashboard triggering */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setInitialImageData(event.target?.result as string);
              setRegistrationMode('upload');
              setIsRegisteringPhoto(true);
            };
            reader.readAsDataURL(file);
          }
        }} 
      />
    </>
  )
}
