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
  Users,
  LayoutGrid,
  ArrowLeft,
  FolderKanban
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
import { FacialAttendanceTerminal } from "./attendance/facial-attendance-terminal"
import { FaceRegistration } from "./student/face-registration"
import { getStudentRooms } from "@/services/room"
import { getStudentAttendance } from "@/services/attendance"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, LogOut } from "lucide-react"
import { signOut } from "@/services/auth"

import { AttendanceLogs } from "./admin/attendance-logs"
import { StudentAttendanceHistory } from "./student/attendance-history"
import { StudentRegistry } from "./admin/student-registry"
import { AdminOverview } from "./admin/admin-overview"
import { getAdminRooms, Room } from "@/services/room"

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
  const [activeTab, setActiveTabLocal] = React.useState(searchParams.get("tab") || (profile?.role === 'admin' ? "overview" : "profile"))
  const [activeView, setActiveView] = React.useState<string | null>(searchParams.get("view") || null)
  const [isRegisteringPhoto, setIsRegisteringPhoto] = React.useState(false)
  const [registrationMode, setRegistrationMode] = React.useState<'camera' | 'upload' | null>(null)
  const [initialImageData, setInitialImageData] = React.useState<string | null>(null)
  const [adminRooms, setAdminRooms] = React.useState<Room[]>([])
  const [selectedTerminalRoom, setSelectedTerminalRoom] = React.useState<string>(profile?.last_room_id || "")
  const [isSelectingRoom, setIsSelectingRoom] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (profile?.role === 'admin') {
      getAdminRooms().then(setAdminRooms).catch(console.error)
    }
  }, [profile?.role])

  React.useEffect(() => {
    if (profile?.last_room_id && !selectedTerminalRoom) {
      setSelectedTerminalRoom(profile.last_room_id)
    }
  }, [profile?.last_room_id])

  const setActiveTab = (tabAndView: string) => {
    const [tab, view] = tabAndView.split(":")
    setActiveTabLocal(tab)
    setActiveView(view || null)
    router.push(`/dashboard?tab=${tab}${view ? `&view=${view}` : ""}`, { scroll: false })
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
        { id: "overview", label: "Overview", icon: LayoutGrid },
        { id: "rooms", label: "Create Room + Event Name", icon: DoorOpen },
        { id: "room_registry", label: "Room Registry", icon: FolderKanban },
        { id: "registry", label: "Student Users", icon: Users },
        { id: "terminal", label: "Facial Attendance", icon: ScanFace },
        { id: "logs", label: "Attendance & Fines", icon: ClipboardList },
        { id: "settings", label: "Profile", icon: User },
      ]
    : [
        { id: "status", label: "Dashboard", icon: Activity },
        { id: "join", label: profile?.last_room_id ? "Join Another Room" : "Join Room", icon: LogIn },
      ];

  // Hide navigation if student is not registered
  const showTabs = profile?.role === 'admin' || profile?.face_registered;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Top Header for Admin - Profile & Account Detail */}
      {profile?.role === 'admin' && (
        <div className="absolute top-8 right-8 z-50 animate-in fade-in slide-in-from-right-4 duration-1000">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 bg-card/40 hover:bg-card/60 active:scale-[0.98] transition-all rounded-2xl px-2 py-2 pr-4 border border-primary/20 hover:border-primary/50 shadow-xl group cursor-pointer backdrop-blur-md">
              <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-lg transition-transform group-hover:rotate-6">
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-primary-foreground font-black text-xs">
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-start leading-none pr-2">
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate tracking-tight max-w-[120px]">
                  {profile?.full_name || user.email?.split("@")[0]}
                </span>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em] mt-0.5">Admin</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 mt-2 rounded-2xl shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl p-2">
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-black text-foreground uppercase tracking-wider truncate">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={() => setActiveTab("overview")} className="rounded-xl px-3 py-2.5 my-1 hover:bg-primary/10 transition-colors cursor-pointer group">
                <LayoutGrid className="mr-3 h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                <span className="font-bold text-sm">Command Center</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("settings")} className="rounded-xl px-3 py-2.5 my-1 hover:bg-primary/10 transition-colors cursor-pointer group">
                <Settings className="mr-3 h-4 w-4 text-primary transition-transform group-hover:rotate-45" />
                <span className="font-bold text-sm">Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10" />

              <DropdownMenuItem onClick={handleSignOut} className="rounded-xl px-3 py-2.5 my-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-black uppercase tracking-widest text-[10px]">Terminate Session</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className={`flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 ${profile?.role === 'admin' && activeTab === 'overview' ? 'hidden' : ''}`}>
          {showTabs && (
            <div className="flex items-center gap-4">
              {profile?.role === 'admin' && activeTab !== 'overview' && (
                <button 
                  onClick={() => setActiveTab("overview")}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-all group"
                >
                  <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>
              )}
              <PillTabs 
                items={profile?.role === 'admin' && activeTab !== 'overview' 
                  ? DASHBOARD_TABS.filter(t => t.id === activeTab) 
                  : DASHBOARD_TABS
                } 
                active={activeTab} 
                onChange={setActiveTab} 
                className="mb-0" 
              />
            </div>
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
        
        {/* Admin: Overview Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="overview" className="animate-in slide-in-from-bottom-2 duration-500">
            <AdminOverview onNavigate={setActiveTab} />
          </TabsContent>
        ) : null}

        {/* Admin: Rooms Tab (Create Only) */}
        {profile?.role === 'admin' ? (
          <TabsContent value="rooms" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground italic uppercase italic font-black">Create Room + Event Name</h2>
              <p className="text-sm text-muted-foreground">Initialize specific room locations and event designations.</p>
            </div>
            <RoomList view="create" />
          </TabsContent>
        ) : null}

        {/* Admin: Room Registry Tab (List Only) */}
        {profile?.role === 'admin' ? (
          <TabsContent value="room_registry" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground italic uppercase italic font-black">Room Registry</h2>
              <p className="text-sm text-muted-foreground">Monitor and manage all active attendance sessions.</p>
            </div>
            <RoomList view="list" />
          </TabsContent>
        ) : null}

        {/* Admin: Logs Tab */}
        {profile?.role === 'admin' ? (
          <TabsContent value="logs" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Attendance Logs</h2>
              <p className="text-sm text-muted-foreground">View real-time attendance and fines.</p>
            </div>
            <AttendanceLogs roomId={profile?.last_room_id || ""} view={activeView} />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold text-foreground">Facial Attendance</h2>
                <p className="text-sm text-muted-foreground">Global biometric scanner for real-time attendance.</p>
              </div>
              <button 
                onClick={() => setIsSelectingRoom(!isSelectingRoom)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 rounded-xl border border-primary/20 transition-all group shrink-0"
              >
                <DoorOpen className="w-4 h-4" />
                {selectedTerminalRoom ? "Switch Room" : "Select Room"}
              </button>
            </div>

            {isSelectingRoom || !selectedTerminalRoom ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                {adminRooms.length === 0 ? (
                  <Card className="col-span-full bg-card/20 border-dashed border-border/60 py-12 rounded-3xl">
                    <div className="flex flex-col items-center justify-center text-center p-6">
                      <DoorOpen className="w-12 h-12 text-muted-foreground/20 mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">No Rooms Available</p>
                      <button onClick={() => setActiveTab("rooms")} className="text-xs text-primary mt-2 hover:underline">Create one now</button>
                    </div>
                  </Card>
                ) : (
                  adminRooms.map((room) => (
                    <Card 
                      key={room.id} 
                      className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-95 rounded-3xl border-2 ${selectedTerminalRoom === room.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                      onClick={() => {
                        setSelectedTerminalRoom(room.id)
                        setIsSelectingRoom(false)
                      }}
                    >
                      <CardHeader className="p-5">
                        <CardTitle className="text-lg font-black uppercase italic truncate">{room.name}</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider line-clamp-1">{room.event_name || "Regular Session"}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <FacialAttendanceTerminal 
                roomId={selectedTerminalRoom} 
                userId={user.id}
                userName={profile?.full_name || "Administrator"}
                isGlobal 
              />
            )}
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
                  registrationType="simple"
                />
              </div>
            ) : (
              <StudentAttendanceHistory 
                studentId={user.id} 
                profile={profile} 
                onUpdateFace={(mode) => {
                  if (mode === 'upload') {
                    fileInputRef.current?.click();
                  } else {
                    // Set mode to null to allow FaceRegistration to show the choice screen
                    setRegistrationMode(mode || null);
                    setInitialImageData(null);
                    setIsRegisteringPhoto(true);
                  }
                }}
              />
            )}
          </TabsContent>
        ) : null}

        {/* 5b. Join Room Tab (Student) */}
        {profile?.role === 'student' ? (
          <TabsContent value="join" className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            <JoinRoom />
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
