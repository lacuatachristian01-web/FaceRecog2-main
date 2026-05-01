"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, Clock, UserCheck, AlertCircle, Scan, Sparkles, LogIn, ArrowRight, Search, Users } from "lucide-react";
import { timeIn, timeOut, getTodayStatus, checkApproval, getRoomParticipantsWithFaces, getAllRegisteredFaces } from "@/services/attendance";
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

// Custom Euclidean Distance to avoid face-api.js internal throw
function getDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function FacialAttendanceTerminal({ roomId, userId, userName, isGlobal = false }: AttendanceTerminalProps) {
  useEffect(() => {
    console.log("FacialAttendanceTerminal [v2.5.1-hardened] initialized");
  }, []);
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
  const [allRegisteredStudents, setAllRegisteredStudents] = useState<any[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const detectionStartTime = useRef<number | null>(null);
  const AUTO_TRIGGER_DELAY = 1200; // Calibrated for "Scanning" vibe visibility

  useEffect(() => {
    if (roomId && userId) {
      fetchStatus();
      checkUserApproval();
      
      // Auto-start camera when room is selected/active
      if (!isStreaming) {
        startTerminal();
      }
    }
  }, [roomId, userId]);

  const checkUserApproval = async () => {
    try {
      if (isGlobal) {
        const [participants, allStudents] = await Promise.all([
          getRoomParticipantsWithFaces(roomId),
          getAllRegisteredFaces()
        ]);
        setAllParticipants(participants);
        setAllRegisteredStudents(allStudents);
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
        
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        if (detection) {
          setFaceDetected(true);
          
          if (!isProcessing && status === 'idle' && isApproved !== false) {
            try {
              let targetEmbeddings = [];
              if (isGlobal) {
                targetEmbeddings = allRegisteredStudents;
              } else {
                const faceData = await getFaceEmbedding(userId);
                if (faceData?.embedding) {
                  targetEmbeddings = [{ id: userId, full_name: userName, face_embedding: faceData.embedding }];
                }
              }
              
              if (targetEmbeddings.length > 0) {
                let bestMatch = null;
                let minDistance = 1.0;

                for (const participant of targetEmbeddings) {
                  const storedEmbedding = participant.face_embedding;
                  if (!storedEmbedding) continue;

                  const storedArray = Array.isArray(storedEmbedding) 
                    ? storedEmbedding 
                    : typeof storedEmbedding === 'string' 
                      ? JSON.parse(storedEmbedding) 
                      : null;

                  if (!storedArray || detection.descriptor.length !== storedArray.length) continue;

                  const distance = getDistance(detection.descriptor, storedArray);
                  if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = participant;
                  }
                }

                if (bestMatch && minDistance < 0.45) {
                  setMatchedStudent(bestMatch);
                  if (!detectionStartTime.current) detectionStartTime.current = Date.now();
                  
                  const elapsed = Date.now() - detectionStartTime.current;
                  setAutoTriggerProgress(Math.min((elapsed / AUTO_TRIGGER_DELAY) * 100, 100));

                    if (elapsed >= AUTO_TRIGGER_DELAY) {
                      detectionStartTime.current = null;
                      setAutoTriggerProgress(0);
                      setShowFlash(true);
                      setTimeout(() => setShowFlash(false), 150);
                      
                      if (isGlobal) {
                      const isEnrolled = allParticipants.some(p => p.id === bestMatch.id);
                      if (!isEnrolled) {
                        setWarningMessage(`${bestMatch.full_name} is not enrolled or approved in this room.`);
                        setStatus('error');
                        setActionMessage("Not Enrolled");
                        return;
                      }

                      const sStatus = await getTodayStatus(roomId, bestMatch.id);
                      const type = !sStatus ? 'in' : 'out';
                      if (!(type === 'out' && sStatus?.time_out)) {
                        let capturedFrame = null;
                        if (!bestMatch.face_image) {
                          const canvasEl = document.createElement("canvas");
                          canvasEl.width = video.videoWidth; canvasEl.height = video.videoHeight;
                          const ctxEl = canvasEl.getContext("2d");
                          if (ctxEl) {
                            ctxEl.scale(-1, 1);
                            ctxEl.drawImage(video, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
                            capturedFrame = canvasEl.toDataURL("image/jpeg", 0.8);
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
                  setMatchedStudent(bestMatch ? null : { full_name: "Unrecognized" });
                  detectionStartTime.current = null;
                  setAutoTriggerProgress(0);
                }
              }
            } catch (err) {
              console.error("Match error", err);
            }
          }

          const resizedDetections = faceapi.resizeResults(detection, displaySize);
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
          setMatchedStudent(null);
          detectionStartTime.current = null;
          setAutoTriggerProgress(0);
          canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
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
      setWarningMessage(null);
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
        const msg = `Successfully Time In!`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance("Time In Successful");
        window.speechSynthesis.speak(utterance);
      } else {
        await timeOut(roomId, userId);
        const msg = `Successfully Time Out!`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance("Time Out Successful");
        window.speechSynthesis.speak(utterance);
      }
      setStatus('success');
      toast.success(type === 'in' ? "Time In recorded" : "Time Out recorded");
      fetchStatus();
      
      // Auto-reset after success
      setTimeout(() => {
        setStatus('idle');
        setMatchedStudent(null);
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
        const msg = `Successfully Time In: ${sName}`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance(`Welcome, ${sName}. Time in successful.`);
        window.speechSynthesis.speak(utterance);
      } else {
        await timeOut(roomId, sId);
        const msg = `Successfully Time Out: ${sName}`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance(`Goodbye, ${sName}. Time out successful.`);
        window.speechSynthesis.speak(utterance);
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
              <CardTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3 uppercase italic text-primary">
                <Scan className="h-6 w-6" />
                Facial Attendance
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
            {/* Quick Guide Overlay */}
            <AnimatePresence>
              {isStreaming && !faceDetected && status === 'idle' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-black/20"
                >
                  <div className="flex flex-col items-center gap-4 text-white/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center animate-[spin_4s_linear_infinite]">
                        <Scan className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Position Face in Frame</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                    "w-[280px] h-[350px] border border-white/10 rounded-[4rem] transition-all duration-500 relative flex items-center justify-center",
                    faceDetected ? "border-primary/50 scale-105 shadow-[0_0_60px_rgba(59,130,246,0.2)]" : "scale-100"
                  )}>
                    {/* Scanning Line Animation */}
                    <AnimatePresence>
                      {faceDetected && !isProcessing && status === 'idle' && (
                        <motion.div
                          initial={{ top: "10%", opacity: 0 }}
                          animate={{ 
                            top: ["10%", "90%", "10%"],
                            opacity: [0, 1, 1, 1, 0]
                          }}
                          transition={{ 
                            duration: 2.5, 
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent z-10 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                        />
                      )}
                    </AnimatePresence>

                    {/* Corner Brackets */}
                    <div className="absolute inset-0">
                      <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-[3rem] opacity-40" />
                      <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-[3rem] opacity-40" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-[3rem] opacity-40" />
                      <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-[3rem] opacity-40" />
                    </div>

                    {/* Inner Pulse Circle */}
                    {faceDetected && (
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-10 border border-primary/30 rounded-[3rem]"
                      />
                    )}

                    {/* Identification Label */}
                    <AnimatePresence>
                      {matchedStudent && status === 'idle' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-24 left-1/2 -translate-x-1/2 bg-primary/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/20 shadow-2xl min-w-[200px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">{matchedStudent.full_name}</span>
                            </div>
                            <span className="text-[8px] font-bold text-white/60 uppercase tracking-tight">Biometric Profile Verified</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Dynamic Status Labels */}
                    {faceDetected && !isProcessing && status === 'idle' && (
                      <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-full">
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-3"
                        >
                          {autoTriggerProgress > 0 ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Scanning Data Points... {Math.round(autoTriggerProgress)}%</span>
                            </>
                          ) : matchedStudent?.full_name === "Unrecognized" ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 italic">Access Denied: Unrecognized</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">Stabilizing Image</span>
                            </>
                          )}
                        </motion.div>
                      </div>
                    )}

                    {/* Auto-Trigger Progress Ring */}
                    {faceDetected && !isProcessing && status === 'idle' && (
                      <svg className="absolute inset-[-20px] w-[calc(100%+40px)] h-[calc(100%+40px)] rotate-[-90deg]">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="170"
                          className="fill-none stroke-blue-500/10 stroke-[2]"
                        />
                        <motion.circle
                          cx="50%"
                          cy="50%"
                          r="170"
                          initial={{ strokeDashoffset: 1068 }}
                          animate={{ strokeDashoffset: 1068 - (1068 * autoTriggerProgress) / 100 }}
                          style={{ strokeDasharray: 1068 }}
                          className="fill-none stroke-primary stroke-[4] transition-all duration-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
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

                {/* Camera Flash Effect */}
                <AnimatePresence>
                  {showFlash && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="absolute inset-0 bg-white z-50 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
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
                    <h3 className="text-2xl font-black tracking-tighter text-foreground mb-2 uppercase italic">
                      {warningMessage ? "Access Denied" : "Biometric Mismatch"}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mb-6">
                      {warningMessage || "The scanned face does not match the registered profile for this account."}
                    </p>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStatus('idle');
                        setWarningMessage(null);
                        setMatchedStudent(null);
                      }}
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
          <div className="w-full text-center space-y-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Biometric Auto-Authentication Active</p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Position your face within the guide for hands-free check-in</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

