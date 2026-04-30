"use client";

import { useState, useEffect } from "react";
import { getStudentAttendance } from "@/services/attendance";
import { toast } from "sonner";
import { Check, X, User, ScanFace, Camera, Upload, RefreshCcw, ClipboardList } from "lucide-react";
import { getStudentRooms } from "@/services/room";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StudentAttendanceHistoryProps {
  studentId: string;
  profile: any;
  onUpdateFace?: (mode: 'camera' | 'upload' | null) => void;
}

export function StudentAttendanceHistory({ studentId, profile, onUpdateFace }: StudentAttendanceHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("University Event");

  useEffect(() => {
    if (studentId) {
      fetchHistory();
    }
  }, [studentId]);

  const fetchHistory = async () => {
    try {
      const [attendanceData, roomsData] = await Promise.all([
        getStudentAttendance(studentId),
        getStudentRooms()
      ]);
      setHistory(attendanceData);
      setRooms(roomsData);
    } catch (error: any) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const tabs = ["University Event", "College Event", "SubOrg Event"];

  const filteredRooms = rooms.filter(room => room && room.event_type === activeTab);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing...</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-4 pb-10">
      {/* Centered Dashboard Title */}
      <h1 className="text-center text-2xl font-black text-white tracking-tighter uppercase italic">
        Dashboard
      </h1>

      {/* Stylized Tabs */}
      <div className="flex bg-[#121214] border border-white/5 rounded-lg p-0.5 shadow-xl">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 px-1 text-[9px] font-bold uppercase tracking-tight transition-all rounded-md",
              activeTab === tab 
                ? "bg-gradient-to-b from-blue-700 to-blue-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* User Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 bg-gradient-to-r from-[#0a0a0c] to-[#121214] border border-white/5 p-4 rounded-xl shadow-2xl"
      >
        <div className="relative group">
          <Avatar className="h-20 w-20 rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-[#0c0c0e]">
            {profile?.face_image ? (
              <AvatarImage src={profile.face_image} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-900/20 to-blue-600/5 text-blue-500">
                <ScanFace className="h-10 w-10 opacity-50 animate-pulse" />
              </AvatarFallback>
            )}
          </Avatar>
          {/* Biometric Scanner Overlay Effect */}
          <div className="absolute inset-0 rounded-xl border border-blue-500/20 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-scan-fast" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-white tracking-tight leading-none uppercase italic">
            {profile?.full_name || "Unknown User"}
          </h2>
          <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
            ID: {profile?.student_id || "N/A"}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
            {profile?.course_year || "N/A"}
          </p>
        </div>

        {/* Photo Actions */}
        <div className="ml-auto">
          <button 
            onClick={() => onUpdateFace?.(null)}
            className="group/btn relative px-4 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
          >
            <div className="flex items-center gap-1.5 justify-center">
              <Camera className="w-3 h-3 group-hover/btn:animate-pulse" />
              {profile?.face_image ? "Edit Profile (v2.1)" : "Register Face (v2.1)"}
            </div>
          </button>
        </div>
      </motion.div>

      {/* Active Events Registry */}
      <div className="space-y-4">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0a0c] border border-dashed border-white/10 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">No active events recorded.</p>
              <p className="text-[8px] text-muted-foreground/50 font-bold uppercase tracking-widest">Join a room to see active sessions here</p>
            </div>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const today = new Date().toISOString().split('T')[0];
            const record = history.find(h => 
              h.room_id === room.id && 
              new Date(h.time_in).toISOString().split('T')[0] === today
            );

            return (
              <motion.div 
                key={room.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c] shadow-2xl group hover:border-primary/30 transition-all duration-500"
              >
                {/* Event Header */}
                <div className="bg-gradient-to-r from-black to-[#121214] px-5 py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">
                      {activeTab}
                    </p>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
                      {room.name} {room.event_name ? `— ${room.event_name}` : ''}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Session Date</span>
                    <span className="text-[10px] font-bold text-white italic">
                      {room.event_date ? new Date(room.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                    </span>
                  </div>
                </div>

                {/* Table Layout */}
                <div className="px-5 pb-5">
                   <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                      <div className="grid grid-cols-3 bg-white/5 py-2 px-4 border-b border-white/5">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Period</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center">Time In</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center">Time Out</span>
                      </div>
                      
                      {/* Morning Session */}
                      <div className="grid grid-cols-3 py-3 px-4 border-b border-white/5 items-center">
                        <span className="text-[9px] font-black text-white uppercase italic tracking-tighter">Morning</span>
                        <div className="flex justify-center">
                          <StatusCell time={record && new Date(record.time_in).getHours() < 12 ? record.time_in : null} type="in" />
                        </div>
                        <div className="flex justify-center">
                          <StatusCell time={(record?.time_out && new Date(record.time_out).getHours() < 13) ? record.time_out : null} type="out" />
                        </div>
                      </div>

                      {/* Afternoon Session */}
                      <div className="grid grid-cols-3 py-3 px-4 items-center">
                        <span className="text-[9px] font-black text-white uppercase italic tracking-tighter">Afternoon</span>
                        <div className="flex justify-center">
                          <StatusCell time={record && new Date(record.time_in).getHours() >= 12 ? record.time_in : null} type="in" />
                        </div>
                        <div className="flex justify-center">
                          <StatusCell time={(record?.time_out && new Date(record.time_out).getHours() >= 13) ? record.time_out : null} type="out" />
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusCell({ time, type }: { time: string | null, type: 'in' | 'out' }) {
  if (!time) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground tracking-tighter">--</span>
        <div className="bg-red-500/20 p-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.2)]">
          <X className="h-2 w-2 text-red-500 stroke-[4]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-[10px] font-black text-white tracking-tighter italic">
        {new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
      <div className="bg-green-500/20 p-0.5 rounded shadow-[0_0_8px_rgba(34,197,94,0.2)]">
        <Check className="h-2 w-2 text-green-500 stroke-[4]" />
      </div>
    </div>
  );
}
