"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, Clock, UserCheck } from "lucide-react";
import { timeIn, timeOut, getTodayStatus, checkApproval } from "@/services/attendance";
import { getFaceEmbedding } from "@/services/face";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, LogIn } from "lucide-react";
import { JoinRoom } from "../student/join-room";

interface AttendanceTerminalProps {
  roomId: string;
  userId: string;
  userName: string;
}

export function AttendanceTerminal({ roomId, userId, userName }: AttendanceTerminalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState("");
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (roomId && userId) {
      fetchStatus();
      checkUserApproval();
    }
  }, [roomId, userId]);

  const checkUserApproval = async () => {
    const approved = await checkApproval(roomId, userId);
    setIsApproved(approved);
  };

  const fetchStatus = async () => {
    try {
      const status = await getTodayStatus(roomId, userId);
      setTodayStatus(status);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        toast.error("Failed to load models");
      }
    };
    loadModels();
  }, []);

  const startTerminal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setStatus('idle');
      }
    } catch (err) {
      toast.error("Camera access denied");
    }
  };

  const processAttendance = async (type: 'in' | 'out') => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      // 1. Detect and Descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("Face not detected. Look directly at the camera.");
        setIsProcessing(false);
        return;
      }

      // 2. Verification
      const storedEmbedding = await getFaceEmbedding(userId);
      if (!storedEmbedding) {
        throw new Error("You haven't registered your face yet.");
      }

      const distance = faceapi.euclideanDistance(
        new Float32Array(detection.descriptor),
        new Float32Array(storedEmbedding as number[])
      );

      // Threshold usually around 0.6 for recognition
      if (distance > 0.5) {
        throw new Error("Face verification failed. Please try again or re-register.");
      }

      // 3. Record Attendance
      if (type === 'in') {
        await timeIn(roomId, userId);
        setActionMessage(`Time In Successful for ${userName}`);
      } else {
        await timeOut(roomId, userId);
        setActionMessage(`Time Out Successful for ${userName}`);
      }

      setStatus('success');
      toast.success(type === 'in' ? "Time In recorded" : "Time Out recorded");
      fetchStatus();

      // Stop camera after success
      setTimeout(() => {
        stopCamera();
      }, 3000);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Attendance failed");
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsStreaming(false);
  };

  if (!roomId) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Join a Room First
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">You need to join a session room using a 6-character code before you can take attendance.</p>
            <JoinRoom />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="text-xl flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Attendance Terminal
            </div>
            {todayStatus && (
              <Badge variant={todayStatus.time_out ? "secondary" : "default"} className={todayStatus.time_out ? "" : "bg-green-500 hover:bg-green-600"}>
                {todayStatus.time_out ? "Status: Session Ended" : "Status: Timed In"}
              </Badge>
            )}
            {!todayStatus && <Badge variant="outline">Status: Not Timed In</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {isStreaming ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-center p-12">
                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
                
                {isApproved === false ? (
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl max-w-sm mx-auto mb-4">
                    <div className="flex items-center gap-2 text-destructive mb-1 justify-center">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-bold text-sm uppercase">Approval Pending</span>
                    </div>
                    <p className="text-xs text-muted-foreground">The admin has not yet approved your request to join this room. Please wait for approval before taking attendance.</p>
                  </div>
                ) : (
                  <Button onClick={startTerminal} disabled={!isModelLoaded} className="bg-primary">
                    {isModelLoaded ? "Activate Terminal" : "Loading Models..."}
                  </Button>
                )}
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-white font-medium">Verifying Face...</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-md flex items-center justify-center">
                <div className="bg-card p-8 rounded-2xl shadow-2xl text-center scale-up-animation max-w-sm w-full mx-4">
                  <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">Attendance Recorded</h3>
                  <p className="text-muted-foreground text-sm mb-4">{actionMessage}</p>
                  
                  {todayStatus && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Events:</span>
                        <div className="flex gap-1">
                          {todayStatus.events?.map((e: string) => (
                            <Badge key={e} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                              {e}
                            </Badge>
                          )) || <span className="text-foreground">Normal</span>}
                        </div>
                      </div>
                      {todayStatus.fines > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Fine Applied:</span>
                          <span className="text-destructive font-bold">₱{todayStatus.fines}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 p-6 border-t border-border">
          {isStreaming && status !== 'success' && (
            <>
              {(!todayStatus) && (
                <Button 
                  onClick={() => processAttendance('in')} 
                  disabled={isProcessing}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 h-16 text-lg"
                >
                  <Clock className="mr-2 h-6 w-6" />
                  Time In
                </Button>
              )}
              {(todayStatus && !todayStatus.time_out) && (
                <Button 
                  onClick={() => processAttendance('out')} 
                  disabled={isProcessing}
                  variant="outline"
                  size="lg"
                  className="border-border hover:bg-accent text-accent-foreground flex-1 h-16 text-lg"
                >
                  <Clock className="mr-2 h-6 w-6" />
                  Time Out
                </Button>
              )}
              {todayStatus?.time_out && (
                <div className="text-sm text-muted-foreground italic">You have completed your attendance for today.</div>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
