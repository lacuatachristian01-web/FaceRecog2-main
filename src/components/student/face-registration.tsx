"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Loader2, Sparkles, Scan, ShieldCheck } from "lucide-react";
import { registerFace } from "@/services/face";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function FaceRegistration() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // 1. Load models
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
        console.error("Error loading models:", err);
        setError("Failed to load facial recognition models.");
        toast.error("Failed to load models");
      }
    };
    loadModels();
  }, []);

  // 2. Face Detection Loop for Overlay
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming && isModelLoaded && videoRef.current && canvasRef.current) {
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight
        };
        
        faceapi.matchDimensions(canvas, displaySize);

        const detections = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        if (detections) {
          setFaceDetected(true);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw face mesh/landmarks in a premium style
            ctx.strokeStyle = "#3b82f6"; // primary color
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            
            const landmarks = resizedDetections.landmarks.positions;
            
            // Draw points
            landmarks.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
              ctx.fillStyle = "#60a5fa";
              ctx.fill();
            });

            // Draw connections for "AI" look
            ctx.beginPath();
            ctx.moveTo(landmarks[0].x, landmarks[0].y);
            for (let i = 1; i < 17; i++) ctx.lineTo(landmarks[i].x, landmarks[i].y);
            ctx.stroke();
          }
        } else {
          setFaceDetected(false);
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isStreaming, isModelLoaded]);

  const [stream, setStream] = useState<MediaStream | null>(null);

  // 3. Start webcam
  const startVideo = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Webcam access denied. Please enable camera permissions.");
      toast.error("Camera access denied");
    }
  };

  // 3b. Attach stream to video element when it becomes available
  useEffect(() => {
    if (isStreaming && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isStreaming, stream]);

  // 4. Capture and Register
  const handleCapture = async () => {
    if (!videoRef.current || !isModelLoaded) return;

    setIsRegistering(true);
    try {
      // Detect single face with high quality
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        toast.error("No face detected. Please ensure your face is clearly visible.");
        setIsRegistering(false);
        return;
      }

      // Save embedding to DB
      const descriptorArray = Array.from(detections.descriptor);
      await registerFace(descriptorArray);

      setRegistrationComplete(true);
      toast.success("Face registered successfully!");
      
      // Stop stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsStreaming(false);

    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Failed to register face");
    } finally {
      setIsRegistering(false);
    }
  };

  if (registrationComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="text-center border-border bg-card shadow-2xl rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary animate-shimmer" />
          <CardHeader className="pt-10">
            <div className="mx-auto bg-primary/10 p-4 rounded-3xl w-fit mb-6 relative">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl bg-primary/20 -z-10"
              />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter text-foreground uppercase italic">
              Identity Verified
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium">
              Your biometric profile has been successfully encrypted and stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-4 text-left border border-border">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-tight">
                Secure facial recognition is now active for your account. You can use this for quick attendance check-ins.
              </p>
            </div>
          </CardContent>
          <CardFooter className="pb-10 pt-6 px-8 flex flex-col gap-3">
            <Button 
              onClick={() => window.location.href = "/dashboard"} 
              className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              Enter Dashboard
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-border bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2 uppercase italic">
              <Scan className="h-6 w-6 text-primary" />
              Biometric Registration
            </CardTitle>
            <CardDescription className="font-medium">
              Establish your digital identity for automated attendance.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 px-3 py-1">
            <Sparkles className="w-3 h-3" />
            AI Enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {!isStreaming ? (
            <div className="text-center p-12 w-full">
              <div className="w-24 h-24 rounded-[2rem] bg-muted/20 border border-white/10 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Camera className="h-10 w-10 text-muted-foreground animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm">
                Position your face clearly in the frame. Good lighting ensures faster registration.
              </p>
              <Button 
                onClick={startVideo} 
                disabled={!isModelLoaded} 
                className="bg-primary text-primary-foreground px-10 h-12 rounded-xl font-bold shadow-xl shadow-primary/20"
              >
                {!isModelLoaded ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initializing AI...
                  </>
                ) : (
                  "Start Scanning"
                )}
              </Button>
            </div>
          ) : (
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
              
              {/* Target Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={cn(
                  "w-[280px] h-[350px] border-2 rounded-[3rem] transition-all duration-500",
                  faceDetected ? "border-primary scale-105 shadow-[0_0_50px_rgba(59,130,246,0.3)]" : "border-white/20 scale-100"
                )}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-4 py-1 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    {faceDetected ? "Face Detected" : "Align Your Face"}
                  </div>
                </div>
              </div>

              {/* Scanning Line Animation */}
              {isRegistering && (
                <motion.div 
                  initial={{ top: "0%" }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_#3b82f6] z-20 pointer-events-none"
                />
              )}
            </>
          )}
          
          <AnimatePresence>
            {isRegistering && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-30"
              >
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xl font-black tracking-tight text-foreground uppercase italic">Analyzing Features</p>
                    <p className="text-sm text-muted-foreground font-medium">Encrypting biometric signature...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-muted/10 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, text: "Good Lighting", desc: "Avoid dark areas" },
              { icon: ShieldCheck, text: "Neutral Face", desc: "Stay still" },
              { icon: RefreshCw, text: "No Obstacles", desc: "Remove glasses" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-2xl bg-card border border-border/50">
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-wider">{item.text}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between p-6 border-t border-border bg-card">
        {isStreaming && (
          <Button 
            variant="outline" 
            onClick={startVideo} 
            disabled={isRegistering}
            className="h-12 rounded-xl border-border px-6 hover:bg-muted font-bold transition-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        )}
        <Button 
          onClick={handleCapture} 
          disabled={!isStreaming || isRegistering || !faceDetected}
          className={cn(
            "ml-auto px-10 h-12 rounded-xl font-bold shadow-xl transition-all duration-300",
            faceDetected ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02]" : "bg-muted text-muted-foreground"
          )}
        >
          {isRegistering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            "Capture Identity"
          )}
        </Button>
      </CardFooter>

      {error && (
        <div className="mx-6 mb-6 p-4 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">System Error</p>
            <p className="text-xs text-destructive/80 font-medium">{error}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// Helper component for Badge if not exists or different
function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: string, className?: string }) {
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-border text-foreground",
    secondary: "bg-secondary text-secondary-foreground"
  }
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}>
      {children}
    </div>
  )
}

