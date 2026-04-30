"use client";

import { useState, useEffect } from "react";
import { createRoom, deleteRoom, getAdminRooms, Room, removeStudentFromRoom, getRoomParticipants, approveStudent } from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Users, Hash, Calendar, Clock, Trash2, UserMinus, ChevronRight, X, Check, Copy, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RoomList({ view }: { view?: string | null }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventType, setNewEventType] = useState("University");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Morning Session Windows
  const [amTimeInStart, setAmTimeInStart] = useState("08:00");
  const [amTimeInEnd, setAmTimeInEnd] = useState("08:30");
  const [amTimeOutStart, setAmTimeOutStart] = useState("11:30");
  const [amTimeOutEnd, setAmTimeOutEnd] = useState("12:00");

  // Afternoon Session Windows
  const [pmTimeInStart, setPmTimeInStart] = useState("13:00");
  const [pmTimeInEnd, setPmTimeInEnd] = useState("13:30");
  const [pmTimeOutStart, setPmTimeOutStart] = useState("16:30");
  const [pmTimeOutEnd, setPmTimeOutEnd] = useState("17:00");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [successRoom, setSuccessRoom] = useState<{name: string, event: string, code: string, type: string} | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied to clipboard!`);
  };

  const format12h = (timeStr?: string | null) => {
    if (!timeStr) return "--:--";
    try {
      const [hours, minutes] = timeStr.split(':');
      let h = parseInt(hours);
      const m = minutes || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await getAdminRooms();
      setRooms(data);
    } catch (error: any) {
      toast.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newEventName) {
      toast.error("Room and Event names are required");
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom(
        newRoomName, 
        undefined, undefined, // Legacy
        newEventName,
        undefined, undefined, undefined, undefined, // Legacy
        amTimeInStart,
        amTimeInEnd,
        amTimeOutStart,
        amTimeOutEnd,
        pmTimeInStart,
        pmTimeInEnd,
        pmTimeOutStart,
        pmTimeOutEnd,
        newEventDate, // Pass date
        newEventType // Pass type
      );
      setSuccessRoom({
        name: newRoomName,
        event: newEventName,
        code: room.code,
        type: newEventType
      });
      setNewRoomName("");
      setNewEventName("");
      toast.success("Room + Event created successfully");
      fetchRooms();
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this session? All attendance records will be lost.")) return;
    try {
      await deleteRoom(roomId);
      toast.success("Session deleted");
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to delete session");
    }
  };

  const handleViewParticipants = async (roomId: string) => {
    setSelectedRoom(roomId);
    try {
      const data = await getRoomParticipants(roomId);
      setParticipants(data);
    } catch (error: any) {
      toast.error("Failed to load students");
    }
  };

  const handleRemoveStudent = async (roomId: string, studentId: string) => {
    if (!confirm("Remove this student from the room?")) return;
    try {
      await removeStudentFromRoom(roomId, studentId);
      toast.success("Student removed");
      handleViewParticipants(roomId);
    } catch (error: any) {
      toast.error("Failed to remove student");
    }
  };

  const handleApproveStudent = async (roomId: string, studentId: string) => {
    try {
      await approveStudent(roomId, studentId);
      toast.success("Student approved");
      handleViewParticipants(roomId);
    } catch (error: any) {
      toast.error("Failed to approve student");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Registry...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Success Modal */}
      {successRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <Card className="relative border-primary/30 bg-card/40 backdrop-blur-2xl rounded-[3rem] shadow-2xl border-2 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <CardHeader className="text-center pt-10 space-y-2">
                <CardTitle className="text-3xl font-black italic uppercase tracking-tight text-foreground">Room Created!</CardTitle>
                <div className="h-px w-24 bg-border/50 mx-auto" />
                <p className="text-sm font-bold text-primary uppercase tracking-wider">
                  {successRoom.name} — {successRoom.event}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {successRoom.type}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-10 space-y-8">
                <div className="relative space-y-4">
                   <div className="flex items-center justify-center gap-3">
                     <div className="h-px flex-1 bg-border/30" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">Room Code</span>
                     <div className="h-px flex-1 bg-border/30" />
                   </div>
                   
                   <div className="group relative cursor-pointer" onClick={() => {
                      navigator.clipboard.writeText(successRoom.code);
                      toast.success("Room code copied!");
                   }}>
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000" />
                      <div className="relative flex items-center justify-center bg-background/50 border-2 border-primary/50 rounded-2xl p-8 shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)] hover:border-primary transition-all">
                        <span className="text-6xl font-black tracking-[0.2em] text-foreground font-mono leading-none drop-shadow-2xl">
                          {successRoom.code}
                        </span>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[9px] text-center mt-3 text-muted-foreground uppercase font-black tracking-widest animate-pulse">Click code to copy</p>
                   </div>
                </div>

                <Button 
                  onClick={() => setSuccessRoom(null)}
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  OK
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {(view === 'create' || !view) && (
        <Card className="relative overflow-hidden border-border/50 bg-card/30 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-2">
          <CardHeader className="pb-4 pt-8 px-8">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                 <Plus className="w-5 h-5" />
               </div>
               <div className="space-y-1">
                 <CardTitle className="text-2xl font-black tracking-tight text-foreground uppercase italic">Initialize Room + Event</CardTitle>
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Setup a new attendance session</p>
               </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleCreateRoom} className="space-y-12 py-4">
              {/* Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 italic">Room Designation</label>
                  <div className="relative group">
                    <Input 
                      placeholder="e.g., BSCS 1B" 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="h-16 rounded-[1.25rem] bg-background/40 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all px-6 text-base font-bold shadow-inner"
                    />
                    <Hash className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 italic">Event Name</label>
                  <div className="relative group">
                    <Input 
                      placeholder="e.g., Cite Week" 
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="h-16 rounded-[1.25rem] bg-background/40 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all px-6 text-base font-bold shadow-inner"
                    />
                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 italic">Session Date</label>
                  <div className="relative group">
                    <Input 
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="h-16 rounded-[1.25rem] bg-background/40 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all px-6 text-base font-bold [color-scheme:dark] shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Event Type Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 italic">Event Category</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['University Event', 'College Event', 'SubOrg Event'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewEventType(type)}
                      className={`h-14 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        newEventType === type 
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                          : 'bg-background/40 border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-background/60'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Morning Session */}
                <div className="relative p-8 rounded-[2rem] bg-orange-500/[0.03] border border-orange-500/10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground italic">Morning Session</h3>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Window Allocation</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: "Time In Start", value: amTimeInStart, setter: setAmTimeInStart },
                      { label: "Time In End", value: amTimeInEnd, setter: setAmTimeInEnd },
                      { label: "Time Out Start", value: amTimeOutStart, setter: setAmTimeOutStart },
                      { label: "Time Out End", value: amTimeOutEnd, setter: setAmTimeOutEnd },
                    ].map((field, idx) => (
                      <div key={idx} className="space-y-2.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">{field.label}</label>
                        <Input 
                          type="time" 
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          className="h-14 rounded-xl bg-background/60 border-border/40 focus:border-orange-500/40 focus:ring-orange-500/5 transition-all px-5 font-bold [color-scheme:dark]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Afternoon Session */}
                <div className="relative p-8 rounded-[2rem] bg-blue-500/[0.03] border border-blue-500/10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground italic">Afternoon Session</h3>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Window Allocation</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: "Time In Start", value: pmTimeInStart, setter: setPmTimeInStart },
                      { label: "Time In End", value: pmTimeInEnd, setter: setPmTimeInEnd },
                      { label: "Time Out Start", value: pmTimeOutStart, setter: setPmTimeOutStart },
                      { label: "Time Out End", value: pmTimeOutEnd, setter: setPmTimeOutEnd },
                    ].map((field, idx) => (
                      <div key={idx} className="space-y-2.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">{field.label}</label>
                        <Input 
                          type="time" 
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          className="h-14 rounded-xl bg-background/60 border-border/40 focus:border-blue-500/40 focus:ring-blue-500/5 transition-all px-5 font-bold [color-scheme:dark]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={creating}
                  className="w-full h-20 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-primary-foreground text-xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.98] italic relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {creating ? (
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-6 border-4 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Authorizing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Authorize & Create Session</span>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
                <p className="text-center mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/50 italic animate-pulse">
                  Biometric authorization required for final initialization
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {(view === 'list' || !view) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length === 0 ? (
            <Card className="col-span-full bg-card/20 border-dashed border-border/60 py-20 rounded-[2.5rem]">
               <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
                    <DoorOpen className="w-8 h-8 opacity-20" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-foreground">Registry Empty</p>
                    <p className="text-xs text-muted-foreground font-medium">No active attendance rooms found.</p>
                  </div>
               </div>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="group relative overflow-hidden bg-card/30 border-border/50 hover:border-primary/40 backdrop-blur-md rounded-[2.5rem] transition-all duration-500 shadow-xl flex flex-col h-full">
                {/* Status Indicator */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                
                <CardHeader className="pb-6 pt-8 px-8 relative z-10">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-4 flex-1">
                      <CardTitle className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none group-hover:text-primary transition-colors">
                        {room.name} {room.event_name ? `— ${room.event_name}` : ''}
                      </CardTitle>
                      
                      <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-green-500/90">Active Session</span>
                        </div>

                        {room.event_date && (
                          <div className="flex items-center gap-2.5">
                            <Calendar className="w-3.5 h-3.5 text-primary/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground italic">
                              {new Date(room.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {room.event_type && (
                          <Badge variant="outline" className="h-6 border-primary/30 bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary px-3 rounded-lg">
                            {room.event_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-12 w-12 rounded-2xl bg-secondary/30 hover:bg-destructive/20 hover:text-destructive transition-all shrink-0"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="px-8 pb-6 space-y-6 relative z-10 flex-1">
                   {/* Join Code Display */}
                   <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 flex items-center justify-between group-hover:border-primary/20 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Join Code</p>
                        <p className="text-lg font-mono font-bold tracking-widest text-primary italic">{room.code}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => handleCopyCode(room.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                   </div>

                   <div className="grid grid-cols-1 gap-4 pt-2">
                      <div className="relative p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 group/window overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                        <div className="flex items-start gap-4">
                          <Clock className="w-4 h-4 text-primary/60 mt-0.5" />
                          <div className="space-y-3">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Morning Window</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/90">IN: {format12h(room.am_time_in_start)} - {format12h(room.am_time_in_end)}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/90">OUT: {format12h(room.am_time_out_start)} - {format12h(room.am_time_out_end)}</span>
                                </div>
                             </div>
                             <div className="flex flex-col pt-3 border-t border-primary/5">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Afternoon Window</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/90">IN: {format12h(room.pm_time_in_start)} - {format12h(room.pm_time_in_end)}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/90">OUT: {format12h(room.pm_time_out_start)} - {format12h(room.pm_time_out_end)}</span>
                                </div>
                             </div>
                          </div>
                        </div>
                      </div>
                   </div>
                </CardContent>

                <CardFooter className="px-8 pb-8 pt-2 relative z-10">
                   <Button 
                    variant="secondary" 
                    className="w-full h-14 bg-secondary/40 hover:bg-primary hover:text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all shadow-lg hover:shadow-primary/20 italic group/btn border border-border/50 hover:border-primary"
                    onClick={() => handleViewParticipants(room.id)}
                  >
                    <Users className="mr-3 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                    Manage Students
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Participant Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-xl border-border/50 bg-card/95 backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-300">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                       <Users className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight uppercase italic">Room Registry</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 ml-13">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Access & Authorization Control</p>
                    {selectedRoom && rooms.find(r => r.id === selectedRoom)?.event_type && (
                      <Badge variant="outline" className="h-4 border-primary/20 bg-primary/5 text-[7px] font-black uppercase tracking-widest text-primary px-2">
                        {rooms.find(r => r.id === selectedRoom)?.event_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl hover:bg-secondary/80 transition-all"
                  onClick={() => setSelectedRoom(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {participants.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 mx-auto flex items-center justify-center opacity-30">
                    <Users className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Registry Empty</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {participants.map((p) => (
                    <div key={p.profiles.id} className="px-10 py-6 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground font-black text-lg uppercase italic border border-border/30">
                             {p.profiles.full_name?.[0]}
                          </div>
                          {!p.is_approved && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-card animate-pulse" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-base uppercase tracking-tight italic text-foreground">{p.profiles.full_name}</span>
                            {!p.is_approved && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-[0.15em]">
                            <span>{p.profiles.student_id}</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>{p.profiles.course_year}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!p.is_approved && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-11 w-11 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/5 group/approve"
                            onClick={() => handleApproveStudent(selectedRoom, p.profiles.id)}
                          >
                            <Check className="h-5 w-5 group-hover/approve:scale-110 transition-transform" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-11 w-11 rounded-xl bg-destructive/5 text-muted-foreground/60 hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/5 group/remove"
                          onClick={() => handleRemoveStudent(selectedRoom, p.profiles.id)}
                        >
                          <UserMinus className="h-5 w-5 group-hover/remove:scale-110 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="px-10 py-8 bg-secondary/30 border-t border-border/50">
              <Button 
                variant="outline" 
                className="w-full h-12 border-border/50 bg-background/50 hover:bg-background rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all" 
                onClick={() => setSelectedRoom(null)}
              >
                Close Registry
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
