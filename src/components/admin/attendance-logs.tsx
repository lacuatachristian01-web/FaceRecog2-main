"use client";

import { useState, useEffect } from "react";
import { getAdminDashboard, AttendanceRecord, deleteAttendanceRecord, getAbsentStudents } from "@/services/attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Clock, User, AlertCircle, Trash2, X, Plus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomList } from "./room-list";
import { getAdminRooms } from "@/services/room";

interface AttendanceLogsProps {
  roomId: string;
}

export function AttendanceLogs({ roomId }: AttendanceLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminRooms, setAdminRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);

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


  if (loading) return <div className="text-center p-8">Loading attendance logs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-foreground">Attendance Records</h2>
          <p className="text-sm text-muted-foreground">Monitor real-time logs and student attendance history.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedRoomId} 
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="bg-background border border-input h-10 px-3 rounded-md text-sm min-w-[200px]"
          >
            <option value="">Select a Room...</option>
            {adminRooms.map(room => (
              <option key={room.id} value={room.id}>{room.name} ({room.code})</option>
            ))}
          </select>

          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fetchLogs(selectedRoomId)}
            title="Refresh logs"
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter(l => !l.time_out).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground italic uppercase">Absence Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{absentStudents.length} Absent</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Student</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Student ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Course/Year</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Time In</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Time Out</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Fines</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                    No attendance records found for this room.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {log.profiles?.full_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.profiles?.student_id || "N/A"}</TableCell>
                    <TableCell className="text-xs">{log.profiles?.course_year || "N/A"}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.time_in).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.time_out ? new Date(log.time_out).toLocaleTimeString() : "--:--"}
                    </TableCell>
                    <TableCell>
                      <span className={log.fines > 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                        ₱{log.fines || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {log.events?.map((event: string) => (
                          <Badge 
                            key={event} 
                            variant="outline" 
                            className={event === 'Late' ? "bg-destructive/10 text-destructive border-destructive/20" : ""}
                          >
                            {event}
                          </Badge>
                        ))}
                        {!log.time_out ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Absent Students
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Student</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Student ID</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest">Course/Year</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-right">Estimated Fine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absentStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                    No absences recorded for today.
                  </TableCell>
                </TableRow>
              ) : (
                absentStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {student.full_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{student.student_id}</TableCell>
                    <TableCell className="text-xs">{student.course_year}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/10">
                        ₱50.00 (Unattended)
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
);
}
