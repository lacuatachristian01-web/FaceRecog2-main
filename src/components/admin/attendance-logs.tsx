"use client";

import { useState, useEffect } from "react";
import { getAdminDashboard, AttendanceRecord, deleteAttendanceRecord, getAbsentStudents, updateAttendanceRecord, getStudentFinesSummary, payStudentFines, restoreFinesSnapshot } from "@/services/attendance";
import { getAllStudents } from "@/services/dashboard";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Clock, User, AlertCircle, Trash2, X, Plus, UserX, Search, Filter, RefreshCw, ScanFace, Users, Activity, Pencil, Save, ChevronRight, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminRooms, getRoomParticipants } from "@/services/room";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AttendanceLogsProps {
  roomId: string;
  view?: string | null;
}

export function AttendanceLogs({ roomId, view }: AttendanceLogsProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentStats, setStudentStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [lastResetSnapshot, setLastResetSnapshot] = useState<any | null>(null);
  const [lastPaymentSnapshot, setLastPaymentSnapshot] = useState<any | null>(null);
  
  // Room filtering
  const [adminRooms, setAdminRooms] = useState<any[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("");
  const [roomParticipants, setRoomParticipants] = useState<any[] | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const rooms = await getAdminRooms();
      setAdminRooms(rooms);
    } catch (err) {
      console.error("Failed to load rooms", err);
    }
  };

  useEffect(() => {
    if (selectedRoomFilter) {
      fetchRoomParticipants(selectedRoomFilter);
      fetchAbsentStudents(selectedRoomFilter);
    } else {
      setRoomParticipants(null);
      setAbsentStudents([]);
    }
  }, [selectedRoomFilter]);

  const fetchAbsentStudents = async (id: string) => {
    try {
      const data = await getAbsentStudents(id);
      setAbsentStudents(data || []);
    } catch (err) {
      console.error("Failed to load absent students", err);
    }
  };

  const fetchRoomParticipants = async (id: string) => {
    setLoadingRoom(true);
    try {
      const data = await getRoomParticipants(id);
      // Extract profiles from participants
      setRoomParticipants(data.map((p: any) => p.profiles).filter(Boolean));
    } catch (err) {
      toast.error("Failed to load room participants");
    } finally {
      setLoadingRoom(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      toast.error("Failed to load student registry");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setLoadingStats(true);
    try {
      const stats = await getStudentFinesSummary(student.id);
      setStudentStats(stats);
    } catch (err) {
      toast.error("Failed to load student metrics");
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePayFines = async () => {
    if (!selectedStudent || !paymentAmount || Number(paymentAmount) <= 0) return;
    setPaying(true);
    try {
      const amount = Number(paymentAmount);
      const result = await payStudentFines(selectedStudent.id, amount);
      if (result.success && result.snapshot) {
        setLastPaymentSnapshot(result.snapshot);
      }
      toast.success(`Successfully processed payment of ₱${amount.toFixed(2)}`);
      setPaymentAmount("");
      
      // Refresh student statistics
      setLoadingStats(true);
      const stats = await getStudentFinesSummary(selectedStudent.id);
      setStudentStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to process fine payment");
    } finally {
      setPaying(false);
      setLoadingStats(false);
    }
  };

  const handleResetFines = async () => {
    if (!selectedStudent) return;
    setPaying(true);
    try {
      const result = await payStudentFines(selectedStudent.id, totalFines);
      if (result.success && result.snapshot) {
        setLastResetSnapshot(result.snapshot);
      }
      toast.success("Successfully reset student fines to zero");
      setPaymentAmount("");
      
      // Refresh student statistics
      setLoadingStats(true);
      const stats = await getStudentFinesSummary(selectedStudent.id);
      setStudentStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset fines");
    } finally {
      setPaying(false);
      setLoadingStats(false);
    }
  };

  const handleUndoReset = async () => {
    if (!selectedStudent || !lastResetSnapshot) return;
    setPaying(true);
    try {
      await restoreFinesSnapshot(lastResetSnapshot);
      toast.success("Successfully restored previous fine balances!");
      setLastResetSnapshot(null);
      
      // Refresh student statistics
      setLoadingStats(true);
      const stats = await getStudentFinesSummary(selectedStudent.id);
      setStudentStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to undo reset");
    } finally {
      setPaying(false);
      setLoadingStats(false);
    }
  };

  const handleUndoPayment = async () => {
    if (!selectedStudent || !lastPaymentSnapshot) return;
    setPaying(true);
    try {
      await restoreFinesSnapshot(lastPaymentSnapshot);
      toast.success("Successfully restored previous fine balances before payment!");
      setLastPaymentSnapshot(null);
      
      // Refresh student statistics
      setLoadingStats(true);
      const stats = await getStudentFinesSummary(selectedStudent.id);
      setStudentStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to undo payment");
    } finally {
      setPaying(false);
      setLoadingStats(false);
    }
  };

  const displayStudents = roomParticipants || students;

  const filteredStudents = displayStudents.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "--:--";
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventName = (name: string) => {
    if (!name) return null;
    
    // Extract everything in parentheses
    const matches = name.match(/\(([^)]+)\)/g) || [];
    let cleanName = name;
    
    // Remove matches from name
    matches.forEach(match => {
      cleanName = cleanName.replace(match, "");
    });
    
    cleanName = cleanName.trim();
    
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold text-sm uppercase italic text-foreground tracking-tight">{cleanName}</span>
        {matches.map((match, i) => {
          const content = match.replace(/[()]/g, "").trim();
          const isAfternoon = content.toLowerCase().includes("afternoon") || content.toLowerCase().includes("pm");
          const isMorning = content.toLowerCase().includes("morning") || content.toLowerCase().includes("am");
          const isHalf = content.toLowerCase().includes("half");
          const isWhole = content.toLowerCase().includes("whole");
          
          let badgeClass = "bg-primary/10 text-primary border-primary/20";
          if (isAfternoon) badgeClass = "bg-orange-500/10 text-orange-500 border-orange-500/25";
          if (isMorning) badgeClass = "bg-sky-500/10 text-sky-500 border-sky-500/25";
          if (isHalf) badgeClass = "bg-amber-500/10 text-amber-500 border-amber-500/25";
          if (isWhole) badgeClass = "bg-indigo-500/10 text-indigo-500 border-indigo-500/25";

          return (
            <Badge 
              key={i} 
              variant="outline" 
              className={cn("px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full", badgeClass)}
            >
              {content}
            </Badge>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Metrics...</p>
    </div>
  );

  const wholeDayAttended = studentStats?.attended?.filter((item: any) => item.is_whole_day) || [];
  const halfDayAttended = studentStats?.attended?.filter((item: any) => !item.is_whole_day) || [];

  const wholeDayMissed = studentStats?.missed?.filter((item: any) => item.is_whole_day) || [];
  const halfDayMissed = studentStats?.missed?.filter((item: any) => !item.is_whole_day) || [];

  const wholeDayEvents = [
    ...wholeDayAttended.map((x: any) => ({ ...x, status: 'attended' })),
    ...wholeDayMissed.map((x: any) => ({ ...x, status: 'missed', time_in: null, time_out: null }))
  ];

  const halfDayEvents = [
    ...halfDayAttended.map((x: any) => ({ ...x, status: 'attended' })),
    ...halfDayMissed.map((x: any) => ({ ...x, status: 'missed', time_in: null, time_out: null }))
  ];

  const wholeDayFines = wholeDayEvents.reduce((sum: number, e: any) => sum + (e.fines || 0), 0);
  const halfDayFines = halfDayEvents.reduce((sum: number, e: any) => sum + (e.fines || 0), 0);

  const totalAttended = wholeDayAttended.length + halfDayAttended.length;
  const totalMissed = wholeDayMissed.length + halfDayMissed.length;
  const totalEventsCount = totalAttended + totalMissed;
  
  // Give 1.0 credit for full attendance (timed out), and 0.5 credit for partial attendance (no time out)
  const attendedCredits = studentStats?.attended?.reduce((sum: number, item: any) => {
    return sum + (item.time_out ? 1.0 : 0.5);
  }, 0) || 0;
  
  const totalFines = studentStats?.totalFines || (wholeDayFines + halfDayFines);
  const attendanceRate = totalFines === 0 
    ? 100 
    : (totalEventsCount > 0 ? Math.round((attendedCredits / totalEventsCount) * 100) : 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 md:px-6">
      <AnimatePresence mode="wait">
        {!selectedStudent ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="border-border/50 bg-card/30 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-2">
              <CardHeader className="px-10 pt-10 pb-6 border-b border-border/50 bg-muted/20">
                <div className="flex flex-col items-center gap-4 text-center">
                   <div className="p-4 rounded-3xl bg-primary/10 text-primary shadow-xl shadow-primary/10">
                     <Users className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                     <CardTitle className="text-3xl font-black tracking-tight text-foreground uppercase italic">Select Student Record</CardTitle>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Personnel & Financial Oversight</p>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Search by name or student ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-16 rounded-2xl bg-background/40 border-border/50 pl-14 pr-6 text-base font-bold transition-all focus:ring-4 focus:ring-primary/10 shadow-inner w-full"
                    />
                  </div>
                  
                  <div className="md:col-span-4 relative group">
                    <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <select 
                      value={selectedRoomFilter}
                      onChange={(e) => setSelectedRoomFilter(e.target.value)}
                      className="w-full h-16 rounded-2xl bg-background/40 border-border/50 pl-14 pr-6 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer shadow-inner"
                    >
                      <option value="" className="bg-card">All Rooms</option>
                      {adminRooms.map(room => (
                        <option key={room.id} value={room.id} className="bg-card">
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      {loadingRoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 rotate-90" />}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-border/50">
                  {filteredStudents.length === 0 ? (
                    <div className="py-20 text-center space-y-4 opacity-30">
                       <UserX className="w-12 h-12 mx-auto" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No matching records found</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="w-full px-10 py-6 flex items-center justify-between hover:bg-primary/5 transition-all group text-left border-l-4 border-transparent hover:border-primary"
                      >
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground font-black text-xl uppercase italic border border-border/30 group-hover:scale-105 transition-transform group-hover:rotate-3 shadow-lg">
                             {student.full_name?.[0]}
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="font-black text-lg uppercase tracking-tight italic text-foreground group-hover:text-primary transition-colors">{student.full_name}</span>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em]">ID: {student.student_id}</span>
                               <span className="w-1 h-1 rounded-full bg-border" />
                               <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em]">{student.course_year}</span>
                             </div>
                           </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-8 border-t border-border/50 bg-muted/5 flex flex-col gap-4">
                 <Button 
                   variant="outline" 
                   className="w-full h-14 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px] italic transition-all active:scale-95"
                   onClick={() => setSearchQuery("")}
                 >
                   View All Students
                 </Button>
                 <button className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/50 hover:text-primary transition-colors italic">
                   Back to Home
                 </button>
              </CardFooter>
            </Card>

            {selectedRoomFilter && (
              <Card className="border-destructive/20 bg-destructive/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-2 mt-8 animate-in fade-in slide-in-from-y-4 duration-300">
                <CardHeader className="px-10 py-8 border-b border-destructive/20 bg-destructive/10 flex items-center justify-between">
                  <CardTitle className="text-xl font-black tracking-tight text-destructive uppercase italic flex items-center gap-3">
                    <UserX className="w-6 h-6" />
                    Students Not Attended Today
                  </CardTitle>
                  <Badge variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive px-4 py-1.5 font-black text-[10px] uppercase tracking-widest italic rounded-full">
                    {absentStudents.length} Students Absent
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-destructive/10">
                    {absentStudents.length === 0 ? (
                      <div className="py-12 text-center space-y-3 opacity-30">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Perfect attendance today!</p>
                      </div>
                    ) : (
                      absentStudents.map((student) => (
                        <div
                          key={student.id}
                          className="px-10 py-5 flex items-center justify-between hover:bg-destructive/[0.02] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive font-black text-sm uppercase italic border border-destructive/20">
                              {student.full_name?.[0]}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-sm uppercase tracking-tight text-foreground">{student.full_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">ID: {student.student_id}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{student.course_year}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-destructive/25 text-destructive bg-destructive/5 font-black uppercase tracking-widest text-[8px] px-2.5 py-0.5">
                            Absent
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Professional Student Admin Profile Header */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 shadow-md flex flex-col items-center justify-center text-center gap-4">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-2xl border border-primary/20 shadow-inner">
                  {selectedStudent.full_name?.[0]}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight text-foreground">{selectedStudent.full_name}</h2>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black text-[9px] uppercase tracking-wider rounded-full py-0.5 px-2.5">
                      Active Student
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Student ID: {selectedStudent.student_id}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> {selectedStudent.course_year}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Administrative KPI Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Attendance Rate */}
              <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attendance Rate</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-3xl font-black text-foreground">{attendanceRate}%</span>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Sessions Attended */}
              <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sessions Attended</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-3xl font-black text-foreground">{totalAttended}</span>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                      {wholeDayAttended.length} Whole Day &bull; {halfDayAttended.length} Half Day
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Sessions Missed */}
              <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sessions Missed</span>
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-3xl font-black text-foreground">{totalMissed}</span>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                      {wholeDayMissed.length} Whole Day &bull; {halfDayMissed.length} Half Day
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Accumulated Penalties */}
              <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outstanding Fines</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-3xl font-black text-amber-500">₱ {totalFines.toFixed(2)}</span>
                      {totalFines === 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 animate-pulse">
                          Successfully Paid
                        </Badge>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                      {totalFines === 0 ? "Account fully cleared" : "Pending admin clearance"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Interactive Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Column 1: Whole Day Events Suite */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden border">
                <CardHeader className="px-8 py-6 border-b border-border/40 bg-muted/20">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-lg font-black tracking-tight text-foreground uppercase italic flex items-center gap-2.5">
                       <span className="w-2.5 h-6 rounded-full bg-blue-500" />
                       Whole Day Events
                     </CardTitle>
                     {loadingStats && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                   </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/40">
                  {/* Attended Section */}
                  <div>
                    <div className="px-8 py-3 bg-emerald-500/[0.02] border-b border-border/40">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Attended Sessions ({wholeDayAttended.length})
                      </h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 bg-muted/10">
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Event Name</TableHead>
                          <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Time In</TableHead>
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Time Out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {wholeDayAttended.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">No attended events</TableCell>
                           </TableRow>
                         ) : (
                           wholeDayAttended.map((log: any, idx: number) => (
                             <TableRow key={log.id || idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                               <TableCell className="px-8 py-3.5">{formatEventName(log.event_name)}</TableCell>
                               <TableCell className="font-mono text-xs text-foreground/85">{formatTime(log.time_in)}</TableCell>
                               <TableCell className="px-8 text-right font-mono text-xs text-foreground/85">{formatTime(log.time_out)}</TableCell>
                             </TableRow>
                           ))
                         )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Missed Section */}
                  <div>
                    <div className="px-8 py-3 bg-destructive/[0.02] border-b border-border/40">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        Events Not Attended ({wholeDayMissed.length})
                      </h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 bg-muted/10">
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Event Name</TableHead>
                          <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Fines</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {wholeDayMissed.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">No events missed</TableCell>
                           </TableRow>
                         ) : (
                           wholeDayMissed.map((log: any, idx: number) => (
                             <TableRow key={log.id || idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                               <TableCell className="px-8 py-3.5">{formatEventName(log.event_name)}</TableCell>
                               <TableCell>
                                 <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-destructive/10 text-destructive border-destructive/20">
                                   Missed
                                 </Badge>
                               </TableCell>
                               <TableCell className="px-8 text-right font-black text-xs text-destructive">
                                 ₱ {(log.fines || 100).toFixed(2)}
                               </TableCell>
                             </TableRow>
                           ))
                         )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="px-8 py-5 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                   <span className="text-xs font-black uppercase italic text-muted-foreground tracking-wider">Whole Day Accumulated Penalty:</span>
                   <span className="text-lg font-black text-blue-500">
                     ₱ {wholeDayFines.toFixed(2)}
                   </span>
                </CardFooter>
              </Card>

              {/* Column 2: Half Day Events Suite */}
              <Card className="border-border/50 bg-card/30 backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden border">
                <CardHeader className="px-8 py-6 border-b border-border/40 bg-muted/20">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-lg font-black tracking-tight text-foreground uppercase italic flex items-center gap-2.5">
                       <span className="w-2.5 h-6 rounded-full bg-amber-500" />
                       Half Day Events
                     </CardTitle>
                     {loadingStats && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
                   </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/40">
                  {/* Attended Section */}
                  <div>
                    <div className="px-8 py-3 bg-emerald-500/[0.02] border-b border-border/40">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Attended Sessions ({halfDayAttended.length})
                      </h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 bg-muted/10">
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Event Name</TableHead>
                          <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Time In</TableHead>
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Time Out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {halfDayAttended.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">No attended events</TableCell>
                           </TableRow>
                         ) : (
                           halfDayAttended.map((log: any, idx: number) => (
                             <TableRow key={log.id || idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                               <TableCell className="px-8 py-3.5">{formatEventName(log.event_name)}</TableCell>
                               <TableCell className="font-mono text-xs text-foreground/85">{formatTime(log.time_in)}</TableCell>
                               <TableCell className="px-8 text-right font-mono text-xs text-foreground/85">{formatTime(log.time_out)}</TableCell>
                             </TableRow>
                           ))
                         )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Missed Section */}
                  <div>
                    <div className="px-8 py-3 bg-destructive/[0.02] border-b border-border/40">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        Events Not Attended ({halfDayMissed.length})
                      </h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 bg-muted/10">
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Event Name</TableHead>
                          <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                          <TableHead className="px-8 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Fines</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {halfDayMissed.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">No events missed</TableCell>
                           </TableRow>
                         ) : (
                           halfDayMissed.map((log: any, idx: number) => (
                             <TableRow key={log.id || idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                               <TableCell className="px-8 py-3.5">{formatEventName(log.event_name)}</TableCell>
                               <TableCell>
                                 <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-destructive/10 text-destructive border-destructive/20">
                                   Missed
                                 </Badge>
                               </TableCell>
                               <TableCell className="px-8 text-right font-black text-xs text-destructive">
                                 ₱ {(log.fines || 100).toFixed(2)}
                               </TableCell>
                             </TableRow>
                           ))
                         )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="px-8 py-5 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                   <span className="text-xs font-black uppercase italic text-muted-foreground tracking-wider">Half Day Accumulated Penalty:</span>
                   <span className="text-lg font-black text-amber-500">
                     ₱ {halfDayFines.toFixed(2)}
                   </span>
                </CardFooter>
              </Card>
            </div>

            {/* Consolidated Total Administrative Penalties Summary & Secure Payment Console */}
            <Card className="border-destructive/30 bg-destructive/[0.02] backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden border">
              <CardContent className="px-8 py-8 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-1.5 text-center lg:text-left">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-black uppercase tracking-widest text-destructive">Administrative Settlement Summary</span>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-lg">
                    Please cross-reference all missed sessions before printing or billing fine penalties. Penalties are accrued at standard rates.
                  </p>
                  <div className="pt-2 text-center lg:text-left flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Grand Total Outstanding Fines</span>
                      <span className={cn(
                        "text-4xl font-black tracking-tight drop-shadow-md leading-none block mt-1",
                        totalFines === 0 ? "text-emerald-500" : "text-destructive"
                      )}>
                        ₱ {totalFines.toFixed(2)}
                      </span>
                    </div>
                    {totalFines === 0 && (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1 animate-pulse h-fit">
                        Successfully Paid
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Secure Payment Terminal */}
                <div className="bg-card border border-border/50 rounded-2xl p-6 w-full lg:max-w-md space-y-4 shadow-lg">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    Secure Fine Payment Console
                  </h5>
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">₱</span>
                      <Input
                        type="number"
                        placeholder="Enter Amount Paid"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        disabled={paying}
                        className="pl-8 h-12 bg-muted/20 border-border/60 text-foreground font-black text-xs focus-visible:ring-primary rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex flex-wrap gap-3 w-full">
                      <Button
                        onClick={handlePayFines}
                        disabled={paying || !paymentAmount || Number(paymentAmount) <= 0}
                        className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider italic shadow-md transition-all disabled:opacity-50"
                      >
                        {paying ? "Processing..." : "Apply Payment"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetFines}
                        disabled={paying || totalFines <= 0}
                        className="h-12 px-4 rounded-xl border-border/60 hover:bg-muted/50 text-foreground text-xs font-black uppercase tracking-wider italic"
                      >
                        Reset Fines
                      </Button>
                      {lastResetSnapshot && (
                        <Button
                          variant="destructive"
                          onClick={handleUndoReset}
                          disabled={paying}
                          className="h-12 px-4 rounded-xl font-black text-xs uppercase tracking-wider italic flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md animate-bounce"
                        >
                          Undo Reset
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleUndoPayment}
                      disabled={paying || !lastPaymentSnapshot}
                      className={cn(
                        "w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-dashed",
                        lastPaymentSnapshot 
                          ? "text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 border-rose-500/30 animate-pulse cursor-pointer" 
                          : "text-muted-foreground/30 border-border/30 cursor-not-allowed opacity-50"
                      )}
                    >
                      Undo Last Payment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Master Bottom Action Button */}
            <div className="pt-4 flex justify-center">
              <Button 
                onClick={() => setSelectedStudent(null)}
                className="w-full md:w-auto h-14 px-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-[1.01] active:scale-95 italic flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Student Directory
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
