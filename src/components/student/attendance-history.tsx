"use client";

import { useState, useEffect } from "react";
import { getStudentAttendance } from "@/services/attendance";
import { toast } from "sonner";
import { Check, X, User, ScanFace, Camera, Upload, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StudentAttendanceHistoryProps {
  studentId: string;
  profile: any;
  onUpdateFace?: (mode: 'camera' | 'upload') => void;
}

export function StudentAttendanceHistory({ studentId, profile, onUpdateFace }: StudentAttendanceHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("University Event");

  useEffect(() => {
    if (studentId) {
      fetchHistory();
    }
  }, [studentId]);

  const fetchHistory = async () => {
    try {
      const data = await getStudentAttendance(studentId);
      setHistory(data);
    } catch (error: any) {
      toast.error("Failed to fetch attendance history");
    } finally {
      setLoading(false);
    }
  };

  const tabs = ["University Event", "College Event", "Sub Org Event"];

  if (loading) return <div className="text-center p-8 text-white">Loading dashboard...</div>;

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
        <div className="ml-auto flex flex-col gap-2">
          {!profile?.face_image ? (
            <>
              <button 
                onClick={() => onUpdateFace?.('camera')}
                className="group/btn relative px-3 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] w-full"
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <Camera className="w-3 h-3 group-hover/btn:animate-pulse" />
                  Take Photo
                </div>
              </button>
              <button 
                onClick={() => onUpdateFace?.('upload')}
                className="group/btn relative px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-zinc-400 uppercase tracking-widest hover:bg-white hover:text-black transition-all w-full"
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <Upload className="w-3 h-3 group-hover/btn:scale-110" />
                  Upload Photo
                </div>
              </button>
            </>
          ) : (
            <button 
              onClick={() => onUpdateFace?.('upload')}
              className="group/btn relative px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:bg-white hover:text-black transition-all w-full"
            >
              <div className="flex items-center gap-1.5 justify-center">
                <RefreshCcw className="w-3 h-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                Edit Photo
              </div>
            </button>
          )}
        </div>
      </motion.div>

      {/* Attendance Events */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
            No active events recorded.
          </div>
        ) : (
          history.map((record) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-xl border border-white/5 shadow-2xl"
            >
              {/* Event Header */}
              <div className="bg-black/80 px-4 py-2 border-b border-white/5">
                <p className="text-[9px] font-black text-white uppercase tracking-wider italic">
                  {activeTab} - {record.rooms?.name || "Event Name"} ({new Date(record.time_in).toLocaleDateString()})
                </p>
              </div>

              {/* Table Sub-header */}
              <div className="bg-gradient-to-r from-[#0a1e3b] to-[#040c1a] px-4 py-1.5 flex justify-center border-b border-white/5">
                <p className="text-[9px] font-black text-white/90 uppercase tracking-[0.2em] italic">
                  Time Attended
                </p>
              </div>

              {/* Attendance Table */}
              <div className="bg-[#0a0a0c]">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="w-[30%] py-2 border-r border-white/5"></th>
                      <th className="w-[35%] py-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest border-r border-white/5">Time In</th>
                      <th className="w-[35%] py-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest">Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Morning Row */}
                    <tr className="border-b border-white/5">
                      <td className="py-2.5 text-[8px] font-black text-white uppercase tracking-tighter italic text-left pl-4 border-r border-white/5">Morning</td>
                      <td className="py-2.5 border-r border-white/5">
                        <StatusCell time={new Date(record.time_in).getHours() < 12 ? record.time_in : null} type="in" />
                      </td>
                      <td className="py-2.5">
                        <StatusCell time={(record.time_out && new Date(record.time_out).getHours() < 13) ? record.time_out : null} type="out" />
                      </td>
                    </tr>
                    {/* Afternoon Row */}
                    <tr>
                      <td className="py-2.5 text-[8px] font-black text-white uppercase tracking-tighter italic text-left pl-4 border-r border-white/5">Afternoon</td>
                      <td className="py-2.5 border-r border-white/5">
                        <StatusCell time={new Date(record.time_in).getHours() >= 12 ? record.time_in : null} type="in" />
                      </td>
                      <td className="py-2.5">
                        <StatusCell time={(record.time_out && new Date(record.time_out).getHours() >= 13) ? record.time_out : null} type="out" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))
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
