"use client";

import { useState, useEffect } from "react";
import { createRoom, deleteRoom, getAdminRooms, Room, removeStudentFromRoom, getRoomParticipants, approveStudent } from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Users, Hash, Calendar, Clock, Trash2, UserMinus, ChevronRight, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    fetchRooms();
  }, []);

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
    if (!newRoomName) return;

    setCreating(true);
    try {
      await createRoom(newRoomName, startTime, endTime);
      setNewRoomName("");
      toast.success("Room created successfully");
      fetchRooms();
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? All attendance records will be lost.")) return;
    try {
      await deleteRoom(roomId);
      toast.success("Room deleted");
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to delete room");
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

  if (loading) return <div className="flex justify-center p-8">Loading rooms...</div>;

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Create New Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Room Name</label>
                <Input
                  placeholder="e.g., BSCS 4A"
                  value={newRoomName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoomName(e.target.value)}
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                  className="bg-background border-input text-foreground"
                />
              </div>
            </div>
            <Button type="submit" disabled={creating} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : "Create Room Session"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No rooms created yet.
          </div>
        ) : (
          rooms.map((room) => (
            <Card key={room.id} className="border-border bg-card hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold text-foreground">{room.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-tighter">
                    {room.code}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Clock className="h-4 w-4 text-primary/70" />
                  <span>{room.start_time} - {room.end_time}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Users className="h-4 w-4 text-primary/70" />
                  <span>Active Session</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="secondary" 
                  className="w-full text-xs font-semibold"
                  onClick={() => handleViewParticipants(room.id)}
                >
                  <Users className="mr-2 h-3 w-3" />
                  Manage Students
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Participant Management Modal/Overlay */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>Room Students</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Manage who can attend this session.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRoom(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {participants.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No students joined yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {participants.map((p) => (
                    <div key={p.profiles.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{p.profiles.full_name}</span>
                          {!p.is_approved && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px] h-4">
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{p.profiles.student_id} • {p.profiles.course_year}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!p.is_approved && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleApproveStudent(selectedRoom, p.profiles.id)}
                            title="Approve Student"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveStudent(selectedRoom, p.profiles.id)}
                          title="Remove Student"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border pt-4">
              <Button variant="outline" className="w-full" onClick={() => setSelectedRoom(null)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
