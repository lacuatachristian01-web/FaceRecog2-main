"use client";

import { useState, useEffect } from "react";
import { getAdminDashboard, AttendanceRecord, deleteAttendanceRecord, getAbsentStudents, updateAttendanceRecord } from "@/services/attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Clock, User, AlertCircle, Trash2, X, Plus, UserX, Search, Filter, RefreshCw, ScanFace, Users, Activity, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminRooms } from "@/services/room";
import { Input } from "@/components/ui/input";

interface AttendanceLogsProps {
  roomId: string;
  view?: string | null;
}

export function AttendanceLogs({ roomId, view }: AttendanceLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminRooms, setAdminRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeIn, setEditTimeIn] = useState("");
  const [editTimeOut, setEditTimeOut] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAdminRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchLogs(selectedRoomId);
    } else {
      setLoading(false);
    }
  }, [selectedRoomId]);

  const fetchAdminRooms = async () => {
    try {
      const rooms = await getAdminRooms();
      setAdminRooms(rooms);
      if (rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rooms[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch admin rooms", err);
    }
  };

  const fetchLogs = async (id: string) => {
    setLoading(true);
    try {
      const [logsData, absentData] = await Promise.all([
        getAdminDashboard(id),
        getAbsentStudents(id)
      ]);
      setLogs(logsData);
      setAbsentStudents(absentData);
    } catch (error: any) {
      toast.error("Failed to fetch attendance logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Delete this attendance record?")) return;
    try {
      await deleteAttendanceRecord(id);
      toast.success("Log deleted");
      fetchLogs(selectedRoomId);
    } catch (error: any) {
      toast.error("Failed to delete log");
    }
  };

  const handleUpdateLog = async (id: string) => {
    setUpdating(true);
    try {
      // Convert time strings back to ISO if needed, but for now we'll just send the update
      // Assuming the inputs provide valid time strings that the backend handles or we format here
      const log = logs.find(l => l.id === id);
      if (!log) return;

      if (!editTimeIn) {
        toast.error("Time In is required");
        return;
      }

      const date = new Date(log.time_in);
      if (isNaN(date.getTime())) {
        toast.error("Invalid original date");
        return;
      }
      
      const parseTime = (timeStr: string) => {
        // Handle HH:mm AM/PM or HH:mm
        const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
        if (!match) return null;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3]?.toUpperCase();
        
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        return { hours, minutes };
      };

      const inTime = parseTime(editTimeIn);
      if (!inTime) {
        toast.error("Invalid Time In format");
        return;
      }
      
      const newInDate = new Date(date);
      newInDate.setHours(inTime.hours, inTime.minutes, 0, 0);
      
      if (isNaN(newInDate.getTime())) {
        toast.error("Resulting Time In is invalid");
        return;
      }

      let newOutDate = null;
      if (editTimeOut) {
        const outTime = parseTime(editTimeOut);
        if (outTime) {
          const tempOut = new Date(date);
          tempOut.setHours(outTime.hours, outTime.minutes, 0, 0);
          if (!isNaN(tempOut.getTime())) {
            newOutDate = tempOut;
          }
        }
      }

      const toSqlString = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        // Construct YYYY-MM-DD HH:mm:ss+00 (Universal UTC format)
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+00`;
      };

      const newTimeIn = toSqlString(newInDate);
      const newTimeOut = newOutDate ? toSqlString(newOutDate) : null;

      await updateAttendanceRecord(id, {
        time_in: newTimeIn,
        time_out: newTimeOut
      } as any);

      toast.success("Log updated");
      setEditingId(null);
      fetchLogs(selectedRoomId);
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(`Error: ${error.message || "Failed to update log"}`);
    } finally {
      setUpdating(false);
    }
  };


  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Syncing Database...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border/50">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-2xl bg-primary/10 text-primary">
               <ClipboardList className="w-5 h-5" />
             </div>
             <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none">Attendance Logs</h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest ml-14">Real-time biometric validation history</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedRoomId} 
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-card/40 border border-border/50 h-12 pl-12 pr-10 rounded-2xl text-xs font-black uppercase tracking-widest min-w-[240px] focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Select Room...</option>
              {adminRooms.map(room => (
                <option key={room.id} value={room.id} className="bg-card text-foreground">{room.name} [{room.code}]</option>
              ))}
            </select>
          </div>

          <Button 
            variant="secondary" 
            size="icon"
            className="h-12 w-12 rounded-2xl bg-secondary/80 hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => fetchLogs(selectedRoomId)}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden bg-card/30 border-border/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Users className="w-6 h-6 text-primary" />
                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-[10px] uppercase font-black tracking-widest">Total Present</Badge>
             </div>
             <div className="space-y-1">
                <div className="text-5xl font-black tracking-tighter text-foreground italic leading-none">{logs.length}</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Verified Entries</p>
             </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-card/30 border-border/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Activity className="w-6 h-6 text-green-500" />
                <Badge variant="outline" className="bg-green-500/5 border-green-500/20 text-[10px] uppercase font-black tracking-widest text-green-500">Live Status</Badge>
             </div>
             <div className="space-y-1">
                <div className="text-5xl font-black tracking-tighter text-foreground italic leading-none">{logs.filter(l => !l.time_out).length}</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Inside Session</p>
             </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-card/30 border-border/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <UserX className="w-6 h-6 text-destructive" />
                <Badge variant="outline" className="bg-destructive/5 border-destructive/20 text-[10px] uppercase font-black tracking-widest text-destructive">Absence Monitor</Badge>
             </div>
             <div className="space-y-1">
                <div className="text-5xl font-black tracking-tighter text-destructive italic leading-none">{absentStudents.length}</div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Unaccounted Students</p>
             </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Logs Table */}
        <Card className="xl:col-span-8 border-border/50 bg-card/30 backdrop-blur-xl rounded-[3rem] overflow-hidden shadow-2xl">
          <CardHeader className="px-10 py-8 border-b border-border/50 bg-card/20">
            <CardTitle className="text-xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-3">
              <ScanFace className="w-6 h-6 text-primary" />
              Real-Time Validation History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 bg-muted/30">
                    <TableHead className="px-8 font-black text-[10px] uppercase tracking-[0.2em] h-14">Registry / ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Check-In/Out</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Financials</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Metric Status</TableHead>
                    <TableHead className="px-8 font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right">Auth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-24">
                         <div className="flex flex-col items-center gap-2 opacity-30">
                            <ClipboardList className="w-12 h-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Active Logs Recorded</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="border-b border-border/40 hover:bg-primary/5 transition-all group">
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground font-black text-xs uppercase italic group-hover:scale-110 transition-transform">
                               {log.profiles?.full_name?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-sm uppercase italic leading-none">{log.profiles?.full_name || "Unknown"}</span>
                              <span className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase mt-1.5">{log.profiles?.student_id || "N/A"} • {log.profiles?.course_year || "N/A"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingId === log.id ? (
                            <div className="flex flex-col gap-2">
                               <Input 
                                 type="time" 
                                 value={editTimeIn} 
                                 onChange={(e) => setEditTimeIn(e.target.value)}
                                 className="h-8 text-[10px] bg-background/50"
                               />
                               <Input 
                                 type="time" 
                                 value={editTimeOut} 
                                 onChange={(e) => setEditTimeOut(e.target.value)}
                                 className="h-8 text-[10px] bg-background/50"
                               />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-foreground/80">
                                 <Clock className="w-3 h-3 text-primary" />
                                 {new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                                 <Clock className="w-3 h-3 opacity-40" />
                                 {log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 ${log.fines > 0 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"}`}>
                            ₱{log.fines || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {log.events?.map((event: string) => (
                              <Badge 
                                key={event} 
                                variant="outline" 
                                className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${event === 'Late' ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/5 text-primary border-primary/20"}`}
                              >
                                {event}
                              </Badge>
                            ))}
                            {!log.time_out && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border-green-500/20 animate-pulse">
                                Session Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {editingId === log.id ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                                  onClick={() => handleUpdateLog(log.id)}
                                  disabled={updating}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-primary/5 text-muted-foreground hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                  onClick={() => {
                                    setEditingId(log.id);
                                    setEditTimeIn(new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                                    setEditTimeOut(log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "");
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-xl bg-destructive/5 text-muted-foreground hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                  onClick={() => handleDeleteLog(log.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Absence Monitor Panel */}
        <Card className="xl:col-span-4 border-border/50 bg-card/30 backdrop-blur-xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-fit">
          <CardHeader className="px-8 py-8 border-b border-border/50 bg-destructive/5">
            <CardTitle className="text-lg font-black tracking-tight text-destructive uppercase italic flex items-center gap-3">
              <UserX className="w-5 h-5" />
              Critical Absences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {absentStudents.length === 0 ? (
                <div className="py-20 text-center space-y-3 px-8 opacity-30">
                  <Activity className="w-10 h-10 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">System Clear: All Accounts Verified</p>
                </div>
              ) : (
                absentStudents.map((student) => (
                  <div key={student.id} className="p-8 hover:bg-destructive/5 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive font-black text-xs uppercase italic group-hover:scale-110 transition-transform">
                         {student.full_name?.[0]}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="font-black text-sm uppercase italic leading-none">{student.full_name}</span>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{student.student_id}</span>
                           <div className="w-1 h-1 rounded-full bg-border" />
                           <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{student.course_year}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                       <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[8px] font-black uppercase tracking-widest px-3 py-1">₱50.00 Fine Applied</Badge>
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Unattended Registry</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
