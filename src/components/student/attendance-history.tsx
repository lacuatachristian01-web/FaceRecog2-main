"use client";

import { useState, useEffect } from "react";
import { getStudentAttendance } from "@/services/attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Calendar, MapPin, AlertCircle } from "lucide-react";

interface StudentAttendanceHistoryProps {
  studentId: string;
}

export function StudentAttendanceHistory({ studentId }: StudentAttendanceHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-center p-8">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Fines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ₱{history.reduce((acc, curr) => acc + (curr.fines || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-border">
            No attendance records found.
          </div>
        ) : (
          history.map((record) => (
            <Card key={record.id} className="border-border bg-card hover:border-primary/30 transition-all group shadow-sm rounded-2xl overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center p-5 gap-4">
                <div className="bg-primary/10 p-3 rounded-xl shrink-0 self-start sm:self-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {record.rooms?.name || "Unknown Room"}
                    {!record.time_out && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] animate-pulse">
                        Currently In
                      </Badge>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      In: {new Date(record.time_in).toLocaleString()}
                    </span>
                    {record.time_out && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Out: {new Date(record.time_out).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:border-l border-border sm:pl-6">
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fines</p>
                    <p className={`font-bold ${record.fines > 0 ? "text-destructive" : "text-foreground"}`}>
                      ₱{record.fines || 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
