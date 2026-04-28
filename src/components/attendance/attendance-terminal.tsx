"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, Clock, UserCheck, AlertCircle, Scan, Sparkles, LogIn, ArrowRight, Search, Users } from "lucide-react";
import { timeIn, timeOut, getTodayStatus, checkApproval, getRoomParticipantsWithFaces } from "@/services/attendance";
import { getFaceEmbedding, updateProfileImage } from "@/services/face";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { JoinRoom } from "../student/join-room";

interface AttendanceTerminalProps {
  roomId: string;
  userId: string;
  userName: string;
  isGlobal?: boolean;
}

export function AttendanceTerminal({ roomId, userId, userName, isGlobal = false }: AttendanceTerminalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState("");
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [autoTriggerProgress, setAutoTriggerProgress] = useState(0);
  const [matchedStudent, setMatchedStudent] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const detectionStartTime = useRef<number | null>(null);
  const AUTO_TRIGGER_DELAY = 1500;

  useEffect(() => {
    if (roomId && userId) {
      fetchStatus();
      checkUserApproval();
    }
  }, [roomId, userId]);

  const checkUserApproval = async () => {
    try {
      if (isGlobal) {
        const participants = await getRoomParticipantsWithFaces(roomId);
        setAllParticipants(participants);
        setIsApproved(true); // Admin is always allowed to use the terminal
      } else {
        const approved = await checkApproval(roomId, userId);
        setIsApproved(approved);
      }
    } catch (err) {
      console.error("Failed to check approval", err);
    }
  };

  const fetchStatus = async () => {
    try {
      const status = await getTodayStatus(roomId, userId);
      setTodayStatus(status);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  // Load models
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

  // Face Detection Loop for Overlay
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming && isModelLoaded && videoRef.current && canvasRef.current) {
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const detections = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        faceapi.matchDimensions(canvas, displaySize);

        if (detections) {
          setFaceDetected(true);
          
          // Auto-trigger & Matching logic
          if (!isProcessing && status === 'idle' && isApproved !== false) {
            try {
              let targetEmbeddings = [];
              if (isGlobal) {
                targetEmbeddings = allParticipants;
              } else {
                const faceData = await getFaceEmbedding(userId);
                if (faceData?.embedding) {
                  targetEmbeddings = [{ id: userId, full_name: userName, face_embedding: faceData.embedding }];
                }
              }
              
              if (targetEmbeddings.length > 0) {
                const fullDetection = await faceapi
                  .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                  .withFaceLandmarks()
                  .withFaceDescriptor();

                if (fullDetection) {
                  let bestMatch = null;
                  let minDistance = 1.0;

                  for (const participant of targetEmbeddings) {
                    const distance = faceapi.euclideanDistance(
                      new Float32Array(fullDetection.descriptor),
                      new Float32Array(participant.face_embedding as number[])
                    );

                    if (distance < minDistance) {
                      minDistance = distance;
                      bestMatch = participant;
                    }
                  }

                  // If match found
                  if (bestMatch && minDistance < 0.45) {
                    setMatchedStudent(bestMatch);
                    if (!detectionStartTime.current) {
                      detectionStartTime.current = Date.now();
                    }
                    const elapsed = Date.now() - detectionStartTime.current;
                    const progress = Math.min((elapsed / AUTO_TRIGGER_DELAY) * 100, 100);
                    setAutoTriggerProgress(progress);

                    if (elapsed >= AUTO_TRIGGER_DELAY) {
                      detectionStartTime.current = null;
                      setAutoTriggerProgress(0);
                      
                      // For global mode, we need to fetch today's status for the specific matched student
                      if (isGlobal) {
                        const sStatus = await getTodayStatus(roomId, bestMatch.id);
                        const type = !sStatus ? 'in' : 'out';
                        if (!(type === 'out' && sStatus?.time_out)) {
                          // Capture image for auto-sync if missing
                          let capturedFrame = null;
                          if (!bestMatch.face_image) {
                            const canvas = document.createElement("canvas");
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                              ctx.scale(-1, 1);
                              ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                              capturedFrame = canvas.toDataURL("image/jpeg", 0.8);
                            }
                          }
                          processGlobalAttendance(bestMatch.id, bestMatch.full_name, type, capturedFrame);
                        }
                      } else {
                        const type = !todayStatus ? 'in' : 'out';
                        if (!(type === 'out' && todayStatus?.time_out)) {
                          processAttendance(type);
                        }
                      }
                    }
                  } else {
                    setMatchedStudent(null);
                    detectionStartTime.current = null;
                    setAutoTriggerProgress(0);
                  }
                }
              }
            } catch (err) {
              console.error("Match error", err);
            }
          }

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            
            const landmarks = resizedDetections.landmarks.positions;
            landmarks.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
              ctx.fillStyle = "#60a5fa";
              ctx.fill();
            });

            ctx.beginPath();
            ctx.moveTo(landmarks[0].x, landmarks[0].y);
            for (let i = 1; i < 17; i++) ctx.lineTo(landmarks[i].x, landmarks[i].y);
            ctx.stroke();
          }
        } else {
          setFaceDetected(false);
          detectionStartTime.current = null;
          setAutoTriggerProgress(0);
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isStreaming, isModelLoaded]);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startTerminal = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" } 
      });
      setStream(mediaStream);
      setIsStreaming(true);
      setStatus('idle');
    } catch (err) {
      toast.error("Camera access denied");
    }
  };

  useEffect(() => {
    if (isStreaming && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isStreaming, stream]);

  const processAttendance = async (type: 'in' | 'out') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (type === 'in') {
        await timeIn(roomId, userId);
        setActionMessage(`Successfully Time In!`);
      } else {
        await timeOut(roomId, userId);
        setActionMessage(`Successfully Time Out!`);
      }
      setStatus('success');
      toast.success(type === 'in' ? "Time In recorded" : "Time Out recorded");
      fetchStatus();
      setTimeout(() => {
        stopCamera();
      }, 4000);
    } catch (err: any) {
      toast.error(err.message || "Attendance failed");
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processGlobalAttendance = async (sId: string, sName: string, type: 'in' | 'out', newPhoto?: string | null) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Silently sync photo if provided
      if (newPhoto) {
        await updateProfileImage(sId, newPhoto);
      }

      if (type === 'in') {
        await timeIn(roomId, sId);
        setActionMessage(`Successfully Time In: ${sName}`);
      } else {
        await timeOut(roomId, sId);
        setActionMessage(`Successfully Time Out: ${sName}`);
      }
      setStatus('success');
      toast.success(`${type === 'in' ? "Time In" : "Time Out"}: ${sName}`);
      
      // Auto-reset after success for global mode
      setTimeout(() => {
        setStatus('idle');
        setMatchedStudent(null);
      }, 3000);
    } catch (err: any) {
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <Card className="border-border bg-card shadow-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="flex items-center gap-3 uppercase italic font-black tracking-tighter">
              <LogIn className="h-5 w-5 text-primary" />
              Room Entry Required
            </CardTitle>
            <CardDescription>You must join an active session before checking in.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <JoinRoom />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-border bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border py-6 px-8">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3 uppercase italic">
                <Scan className="h-6 w-6 text-primary" />
                Live Terminal
              </CardTitle>
              <CardDescription className="font-medium">Secure facial authentication system</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isGlobal ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  <Users className="w-3 h-3" />
                  {allParticipants.length} Students Active
                </Badge>
              ) : todayStatus ? (
                <Badge className={cn(
                  "gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                  todayStatus.time_out ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", todayStatus.time_out ? "bg-muted-foreground" : "bg-emerald-500")} />
                  {todayStatus.time_out ? "Session Completed" : "Currently Active"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Waiting for Check-in
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
            {isStreaming ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                />
                
                {/* Visual Guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={cn(
                    "w-[240px] h-[300px] border-2 rounded-[3rem] transition-all duration-500 relative",
                    faceDetected ? "border-primary scale-105 shadow-[0_0_40px_rgba(59,130,246,0.3)]" : "border-white/10 scale-100"
                  )}>
                    {/* Identification Label */}
                    <AnimatePresence>
                      {matchedStudent && status === 'idle' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-16 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{matchedStudent.full_name}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Auto-Trigger Progress Ring */}
                    {faceDetected && !isProcessing && status === 'idle' && (
                      <svg className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] rotate-[-90deg]">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="150"
                          className="fill-none stroke-blue-500/20 stroke-[4]"
                        />
                        <motion.circle
                          cx="50%"
                          cy="50%"
                          r="150"
                          initial={{ strokeDashoffset: 942 }}
                          animate={{ strokeDashoffset: 942 - (942 * autoTriggerProgress) / 100 }}
                          style={{ strokeDasharray: 942 }}
                          className="fill-none stroke-blue-500 stroke-[4] transition-all duration-100"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center z-20"
                  >
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-foreground font-black uppercase tracking-tighter italic text-xl">Verifying...</p>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="text-center p-12">
                <div className="w-24 h-24 rounded-[2rem] bg-muted/20 border border-white/5 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                  <Camera className="h-10 w-10 text-muted-foreground/40" />
                </div>
                
                {isApproved === false ? (
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl max-w-sm mx-auto mb-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-destructive mb-1 justify-center">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-black text-xs uppercase tracking-widest italic">Awaiting Approval</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">The room administrator has not approved your profile yet.</p>
                  </div>
                ) : (
                  <Button 
                    onClick={startTerminal} 
                    disabled={!isModelLoaded} 
                    className="bg-primary text-primary-foreground h-12 px-8 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {isModelLoaded ? "Start Authentication" : "Loading Neural Engine..."}
                  </Button>
                )}
              </div>
            )}

            <AnimatePresence>
              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="absolute inset-0 bg-primary/10 backdrop-blur-xl flex items-center justify-center z-30 p-6"
                >
                  <Card className="bg-card/95 border-primary/20 shadow-2xl rounded-[2.5rem] max-w-sm w-full text-center p-8 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-shimmer" />
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-6">
                      <CheckCircle2 className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter text-foreground mb-2 uppercase italic">{actionMessage}</h3>
                    <p className="text-sm text-muted-foreground font-medium mb-6">Attendance successfully recorded in the blockchain.</p>
                    
                    {todayStatus && (
                      <div className="space-y-3 pt-6 border-t border-border">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span>Timeline Status</span>
                          <div className="flex gap-1.5">
                            {todayStatus.events?.length > 0 ? todayStatus.events.map((e: string) => (
                              <Badge key={e} variant="outline" className="bg-destructive/5 text-destructive border-destructive/10 px-2 py-0 text-[9px]">
                                {e}
                              </Badge>
                            )) : <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/10 px-2 py-0 text-[9px]">Punctual</Badge>}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="absolute inset-0 bg-destructive/10 backdrop-blur-xl flex items-center justify-center z-30 p-6"
                >
                  <Card className="bg-card/95 border-destructive/20 shadow-2xl rounded-[2.5rem] max-w-sm w-full text-center p-8 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-destructive animate-shimmer" />
                    <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-6">
                      <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter text-foreground mb-2 uppercase italic">Biometric Mismatch</h3>
                    <p className="text-sm text-muted-foreground font-medium mb-6">The scanned face does not match the registered profile for this account.</p>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setStatus('idle')}
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl uppercase font-black tracking-widest text-[10px] h-10 px-6"
                    >
                      Try Again
                    </Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>

        <CardFooter className="p-8 border-t border-border bg-muted/5">
          {isStreaming && status !== 'success' && (
            <div className="flex w-full gap-4">
              {(!todayStatus) && (
                <Button 
                  onClick={() => processAttendance('in')} 
                  disabled={isProcessing || !faceDetected}
                  size="lg"
                  className={cn(
                    "flex-1 h-16 rounded-2xl text-xl font-black uppercase italic tracking-tighter shadow-xl transition-all duration-300",
                    faceDetected ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02]" : "bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowRight className="mr-3 h-6 w-6" />
                  Clock In
                </Button>
              )}
              {(todayStatus && !todayStatus.time_out) && (
                <Button 
                  onClick={() => processAttendance('out')} 
                  disabled={isProcessing || !faceDetected}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "flex-1 h-16 rounded-2xl text-xl font-black uppercase italic tracking-tighter transition-all duration-300",
                    faceDetected ? "border-primary text-primary hover:bg-primary/5" : "border-border text-muted-foreground"
                  )}
                >
                  <Clock className="mr-3 h-6 w-6" />
                  Clock Out
                </Button>
              )}
              {todayStatus?.time_out && (
                <div className="w-full text-center py-4 text-muted-foreground font-medium italic">
                  Session duty completed for today.
                </div>
              )}
            </div>
          )}
          {!isStreaming && (
            <div className="w-full text-center">
               <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Biometric Verification Mode Active</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

