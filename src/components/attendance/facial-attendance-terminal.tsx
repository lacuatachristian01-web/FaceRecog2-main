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
  const [currentSession, setCurrentSession] = useState<'AM' | 'PM'>('AM');
  const [manualSession, setManualSession] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [autoTriggerProgress, setAutoTriggerProgress] = useState(0);
  const [matchedStudent, setMatchedStudent] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [allRegisteredStudents, setAllRegisteredStudents] = useState<any[]>([]);
  const [currentUserEmbedding, setCurrentUserEmbedding] = useState<any>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const detectionStartTime = useRef<number | null>(null);
  const [unrecognizedStartTime, setUnrecognizedStartTime] = useState<number | null>(null);
  const AUTO_TRIGGER_DELAY = 800; // Reduced for faster "Vibe"

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
        
        // Pre-parse embeddings for extreme speed
        const parsedStudents = allStudents.map(s => ({
          ...s,
          parsed_embedding: typeof s.face_embedding === 'string' 
            ? JSON.parse(s.face_embedding) 
            : Array.isArray(s.face_embedding) 
              ? s.face_embedding 
              : null
        })).filter(s => s.parsed_embedding);

        const parsedParticipants = participants.map(p => ({
          ...p,
          parsed_embedding: typeof p.face_embedding === 'string' 
            ? JSON.parse(p.face_embedding) 
            : Array.isArray(p.face_embedding) 
              ? p.face_embedding 
              : null
        }));

        setAllParticipants(parsedParticipants);
        setAllRegisteredStudents(parsedStudents);
        setIsApproved(true);
      } else {
        const [approved, faceData] = await Promise.all([
          checkApproval(roomId, userId),
          getFaceEmbedding(userId)
        ]);
        setIsApproved(approved);
        if (faceData?.embedding) {
          setCurrentUserEmbedding({
            id: userId,
            full_name: userName,
            parsed_embedding: typeof faceData.embedding === 'string' 
              ? JSON.parse(faceData.embedding) 
              : Array.isArray(faceData.embedding) 
                ? faceData.embedding 
                : null
          });
        }
      }
    } catch (err) {
      console.error("Failed to check approval", err);
    }
  };

  const fetchStatus = async () => {
    try {
      const result = await getTodayStatus(roomId, userId, manualSession ? currentSession : undefined);
      if (result.error) {
        console.error("Status error:", result.error);
        return;
      }
      setTodayStatus(result.data);
      if (result.sessionType && !manualSession) setCurrentSession(result.sessionType);
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
        let bestMatch: any = null;
        let minDistance = 1.0;
        
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        if (detection) {
          if (!faceDetected) console.log("Face detected with score:", (detection as any).detection?.score);
          setFaceDetected(true);
          
          if (!isProcessing && status === 'idle' && isApproved !== false) {
            try {
              let targetEmbeddings = [];

              if (isGlobal) {
                targetEmbeddings = allRegisteredStudents;
              } else if (currentUserEmbedding) {
                targetEmbeddings = [currentUserEmbedding];
              }
              
              if (targetEmbeddings.length > 0) {
                // Priority Search: Try to match participants first for extreme speed
                let priorityMatch = null;
                let priorityDistance = 1.0;
                
                // 1. Check Room Participants first
                if (isGlobal && allParticipants.length > 0) {
                  for (const p of allParticipants) {
                    const emb = p.parsed_embedding || (typeof p.face_embedding === 'string' ? JSON.parse(p.face_embedding) : p.face_embedding);
                    if (!emb || detection.descriptor.length !== emb.length) continue;
                    const d = getDistance(detection.descriptor, emb);
                    if (d < priorityDistance) {
                      priorityDistance = d;
                      priorityMatch = p;
                    }
                  }
                }

                // 2. If no participant match, check global (or if not global mode)
                if (priorityMatch && priorityDistance < 0.6) {
                  bestMatch = priorityMatch;
                  minDistance = priorityDistance;
                } else {
                  for (const participant of targetEmbeddings) {
                    const storedArray = participant.parsed_embedding;
                    if (!storedArray || detection.descriptor.length !== storedArray.length) continue;

                    const distance = getDistance(detection.descriptor, storedArray);
                    if (distance < minDistance) {
                      minDistance = distance;
                      bestMatch = participant;
                    }
                  }
                }

                // Relaxed threshold slightly to 0.6 for better recognition in varied lighting
                if (bestMatch && minDistance < 0.6) {
                  setMatchedStudent(bestMatch);
                  if (!detectionStartTime.current) detectionStartTime.current = Date.now();
                  
                  const elapsed = Date.now() - detectionStartTime.current;
                  setAutoTriggerProgress(Math.min((elapsed / AUTO_TRIGGER_DELAY) * 100, 100));

                    if (elapsed >= AUTO_TRIGGER_DELAY) {
                      setIsProcessing(true); // Lock immediately
                      detectionStartTime.current = null;
                      setAutoTriggerProgress(0);
                      setShowFlash(true);
                      setTimeout(() => setShowFlash(false), 150);
                      
                      if (isGlobal) {
                        processGlobalAttendance(bestMatch.id, bestMatch.full_name, bestMatch.face_image ? null : 'PENDING');
                      } else {
                        const type = !todayStatus ? 'in' : 'out';
                        processAttendance(type);
                      }
                    }
                } else {
                  setMatchedStudent(bestMatch ? null : { full_name: "Unrecognized" });
                  detectionStartTime.current = null;
                  setAutoTriggerProgress(0);
                  
                  // Handle Unrecognized Notification
                  if (!unrecognizedStartTime) {
                    setUnrecognizedStartTime(Date.now());
                  } else if (Date.now() - unrecognizedStartTime > 3000) {
                    toast.error("Face not recognized. Please try again.", {
                      id: 'unrecognized-toast'
                    });
                    setUnrecognizedStartTime(Date.now()); // Reset to avoid spam
                  }
                }
              }
            } catch (err) {
              console.error("Match error", err);
            }
          }

          // Reset unrecognized timer if a match is found
          if (bestMatch && minDistance < 0.6) {
            setUnrecognizedStartTime(null);
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
    // Check if already complete
    if (type === 'out' && todayStatus?.time_out) {
      toast.info("Your attendance session is already complete for today.");
      setIsProcessing(false);
      return;
    }

    try {
      if (type === 'in') {
        const result = await timeIn(roomId, userId);
        if (result.error) throw new Error(result.error);
        
        const msg = `Successfully Time In!`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance("Time In Successful");
        window.speechSynthesis.speak(utterance);
      } else {
        const result = await timeOut(roomId, userId);
        if (result.error) throw new Error(result.error);

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

  const processGlobalAttendance = async (sId: string, sName: string, photoStatus?: string | null) => {
    try {
      // 1. Enrollment check
      const isEnrolled = allParticipants.some(p => p.id === sId);
      if (!isEnrolled) {
        const msg = `${sName} is not enrolled in this room.`;
        setWarningMessage(msg);
        toast.error(msg, { id: `not-enrolled-${sId}` });
        setStatus('error');
        setActionMessage("Not Enrolled");
        return;
      }

      // 2. Status check
      const result = await getTodayStatus(roomId, sId);
      const sStatus = result.data;
      const type = !sStatus ? 'in' : 'out';
      
      if (type === 'out' && sStatus?.time_out) {
        toast.info(`${sName} has already completed today's session.`, {
          id: `session-done-${sId}`
        });
        return;
      }

      // 3. Optional Photo Capture (if missing)
      if (photoStatus === 'PENDING' && videoRef.current) {
        try {
          const video = videoRef.current;
          const canvasEl = document.createElement("canvas");
          canvasEl.width = video.videoWidth; 
          canvasEl.height = video.videoHeight;
          const ctxEl = canvasEl.getContext("2d");
          if (ctxEl) {
            ctxEl.scale(-1, 1);
            ctxEl.drawImage(video, -canvasEl.width, 0, canvasEl.width, canvasEl.height);
            const newPhoto = canvasEl.toDataURL("image/jpeg", 0.8);
            await updateProfileImage(sId, newPhoto);
          }
        } catch (photoErr) {
          console.warn("Silent photo sync failed", photoErr);
        }
      }

      if (type === 'in') {
        const result = await timeIn(roomId, sId, manualSession ? currentSession : undefined);
        if (result.error) throw new Error(result.error);

        const msg = `Successfully Time In: ${sName}`;
        setActionMessage(msg);
        const utterance = new SpeechSynthesisUtterance(`Welcome, ${sName}. Time in successful.`);
        window.speechSynthesis.speak(utterance);
      } else {
        const result = await timeOut(roomId, sId);
        if (result.error) throw new Error(result.error);

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
              <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border">
                <button 
                  onClick={() => {
                    setCurrentSession('AM');
                    setManualSession(true);
                  }}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                    currentSession === 'AM' 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Morning
                </button>
                <button 
                  onClick={() => {
                    setCurrentSession('PM');
                    setManualSession(true);
                  }}
                  className={cn(
                    "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                    currentSession === 'PM' 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Afternoon
                </button>
              </div>
              
              {isGlobal ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  <Users className="w-3 h-3" />
                  {allParticipants.length} Students Enrolled
                </Badge>
              ) : todayStatus ? (
                <Badge className={cn(
                  "gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                  todayStatus.time_out ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", todayStatus.time_out ? "bg-muted-foreground" : "bg-emerald-500")} />
                  {todayStatus.time_out ? `${currentSession} Session Done` : `${currentSession} Currently Active`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Waiting for {currentSession} In
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
                    "w-[320px] h-[320px] border border-white/10 rounded-[48px] transition-all duration-500 relative flex items-center justify-center",
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

                    {/* Inner Pulse Circle & Progress Percent */}
                    {faceDetected && (
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-10 border border-primary/30 rounded-[3rem] flex items-center justify-center"
                      >
                        {autoTriggerProgress > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-6xl font-black text-primary/40 italic flex flex-col items-center"
                          >
                            <span className="leading-none">{Math.round(autoTriggerProgress)}</span>
                            <span className="text-xl tracking-[0.5em] ml-2">%</span>
                          </motion.div>
                        )}
                      </motion.div>
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
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Confirming Attendance... {Math.round(autoTriggerProgress)}%</span>
                            </>
                          ) : matchedStudent?.full_name === "Unrecognized" ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive italic">Face Unrecognized: Try Again</span>
                            </>
                          ) : matchedStudent ? (
                             <>
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 italic">Confirm Attendance: {matchedStudent.full_name}</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">Searching Database...</span>
                            </>
                          )}
                        </motion.div>
                      </div>
                    )}

                    {/* Auto-Trigger Progress Border */}
                    {faceDetected && !isProcessing && status === 'idle' && (
                      <svg className="absolute inset-[-20px] w-[calc(100%+40px)] h-[calc(100%+40px)]">
                        <rect
                          x="10"
                          y="10"
                          width="340"
                          height="340"
                          rx="58"
                          className="fill-none stroke-blue-500/10 stroke-[2]"
                        />
                        <motion.rect
                          x="10"
                          y="10"
                          width="340"
                          height="340"
                          rx="58"
                          initial={{ strokeDashoffset: 1360 }}
                          animate={{ strokeDashoffset: 1360 - (1360 * autoTriggerProgress) / 100 }}
                          style={{ strokeDasharray: 1360 }}
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
                  className="absolute inset-0 bg-emerald-500/20 backdrop-blur-2xl flex items-center justify-center z-30 p-6"
                >
                  <Card className="bg-card/95 border-emerald-500/30 shadow-[0_0_100px_rgba(16,185,129,0.2)] rounded-[3rem] max-w-sm w-full text-center p-10 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 animate-pulse" />
                    <div className="mx-auto bg-emerald-500/20 p-6 rounded-full w-fit mb-8 shadow-inner ring-4 ring-emerald-500/10">
                      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                    </div>
                    
                    <div className="space-y-4">
                      <Badge className="bg-emerald-500 text-white border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] italic rounded-full mb-2">
                        Biometric Match Verified
                      </Badge>
                      <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none uppercase italic drop-shadow-sm">
                        {actionMessage}
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-80">
                        Attendance Log Secured
                      </p>
                    </div>
                    
                    {todayStatus && (
                      <div className="mt-10 pt-8 border-t border-emerald-500/10">
                        <div className="flex justify-between items-center bg-secondary/30 px-5 py-3 rounded-2xl border border-border/50">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Status</span>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest">
                            Punctual
                          </Badge>
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
          <div className="w-full text-center space-y-2 min-h-[40px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {faceDetected ? (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1"
                >
                  {autoTriggerProgress > 0 ? (
                    <>
                      <p className="text-[12px] font-black text-primary uppercase tracking-[0.2em] italic animate-pulse">Confirming Attendance... {Math.round(autoTriggerProgress)}%</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Hold still to finalize check-in</p>
                    </>
                  ) : matchedStudent?.full_name === "Unrecognized" ? (
                    <>
                      <p className="text-[12px] font-black text-destructive uppercase tracking-[0.2em] italic">Try Again: Face Unrecognized</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Position your face clearly within the guide</p>
                    </>
                  ) : matchedStudent ? (
                    <>
                      <p className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Confirm Attendance: {matchedStudent.full_name}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Identification Verified • Auto-triggering...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] font-black text-blue-400 uppercase tracking-[0.2em] italic animate-pulse">Searching Database...</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Analyzing biometric profile</p>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1"
                >
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Biometric Auto-Authentication Active</p>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Position your face within the guide for hands-free check-in</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

