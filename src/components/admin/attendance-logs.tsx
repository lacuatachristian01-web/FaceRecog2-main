"use client";

import { useState, useEffect } from "react";
import { getAdminDashboard, AttendanceRecord, deleteAttendanceRecord, getAbsentStudents, updateAttendanceRecord, getStudentFinesSummary } from "@/services/attendance";
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
  
  // Room filtering
  const [adminRooms, setAdminRooms] = useState<any[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("");
  const [roomParticipants, setRoomParticipants] = useState<any[] | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

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
    } else {
      setRoomParticipants(null);
    }
  }, [selectedRoomFilter]);

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

  const displayStudents = roomParticipants || students;

  const filteredStudents = displayStudents.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "--:--";
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Metrics...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Student Header */}
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedStudent(null)}
                className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-black uppercase tracking-widest text-[10px]"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Select Student
              </Button>
              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary px-4 py-1 font-black text-[10px] uppercase tracking-widest italic">
                {selectedStudent.full_name} — Profile Detail
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
              {/* Events Attended */}
              <Card className="border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-2">
                <CardHeader className="px-10 py-8 border-b border-emerald-500/20 bg-emerald-500/10">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-xl font-black tracking-tight text-emerald-500 uppercase italic flex items-center gap-3">
                       <CheckCircle2 className="w-6 h-6" />
                       Events Attended
                     </CardTitle>
                     {loadingStats && <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />}
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                     <TableHeader>
                       <TableRow className="border-b border-emerald-500/10 bg-emerald-500/5">
                         <TableHead className="px-10 h-14 font-black text-[10px] uppercase tracking-widest text-emerald-500/60">Event Name</TableHead>
                         <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-emerald-500/60">Time In</TableHead>
                         <TableHead className="px-10 h-14 font-black text-[10px] uppercase tracking-widest text-emerald-500/60 text-right">Time Out</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {!studentStats || studentStats.attended.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-16 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">No attendance records found</TableCell>
                          </TableRow>
                        ) : (
                          studentStats.attended.map((log: any) => (
                            <TableRow key={log.id} className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors">
                              <TableCell className="px-10 py-5 font-bold text-sm uppercase italic text-foreground">{log.event_name}</TableCell>
                              <TableCell className="font-mono text-xs text-emerald-500/80">{formatTime(log.time_in)}</TableCell>
                              <TableCell className="px-10 text-right font-mono text-xs text-emerald-500/80">{formatTime(log.time_out)}</TableCell>
                            </TableRow>
                          ))
                        )}
                     </TableBody>
                   </Table>
                </CardContent>
              </Card>

              {/* Events Not Attended */}
              <Card className="border-destructive/20 bg-destructive/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-2">
                <CardHeader className="px-10 py-8 border-b border-destructive/20 bg-destructive/10">
                   <CardTitle className="text-xl font-black tracking-tight text-destructive uppercase italic flex items-center gap-3">
                     <AlertCircle className="w-6 h-6" />
                     Events Not Attended
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                     <TableHeader>
                       <TableRow className="border-b border-destructive/10 bg-destructive/5">
                         <TableHead className="px-10 h-14 font-black text-[10px] uppercase tracking-widest text-destructive/60">Event Name</TableHead>
                         <TableHead className="px-10 h-14 font-black text-[10px] uppercase tracking-widest text-destructive/60 text-right">Fines</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {!studentStats || studentStats.missed.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-16 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">Zero missed events detected</TableCell>
                          </TableRow>
                        ) : (
                          studentStats.missed.map((m: any) => (
                            <TableRow key={m.id} className="border-b border-destructive/5 hover:bg-destructive/5 transition-colors">
                              <TableCell className="px-10 py-5 font-bold text-sm uppercase italic text-foreground">{m.event_name}</TableCell>
                              <TableCell className="px-10 text-right font-black text-xs text-destructive">₱ {m.fines.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                     </TableBody>
                   </Table>
                </CardContent>
                <CardFooter className="px-10 py-6 border-t border-destructive/10 bg-destructive/5 flex items-center justify-between">
                   <span className="text-lg font-black uppercase italic text-destructive tracking-tighter">Total Fines:</span>
                   <span className="text-3xl font-black text-destructive drop-shadow-lg leading-none">
                     ₱ {studentStats?.totalFines?.toFixed(2) || "0.00"}
                   </span>
                </CardFooter>
              </Card>
            </div>

            <div className="pt-4">
               <Button 
                 className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95 italic"
                 onClick={() => setSelectedStudent(null)}
               >
                 Back to Select Student
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
