"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  Camera
} from "lucide-react";
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
  const [guideMessage, setGuideMessage] = useState("Center Your Face");
  const [isCorrectPosture, setIsCorrectPosture] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [retakeCount, setRetakeCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
  const detectionStartTime = useRef<number | null>(null);
  const MAX_RETAKES = 3;
  const AUTO_CAPTURE_DELAY = 500; // 0.5s for instant feel

  // 1. Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        startVideo();
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Failed to load facial recognition models.");
      }
    };
    loadModels();
  }, []);

  // 2. Start webcam
  const startVideo = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });
      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Webcam access denied.");
    }
  };

  const latestDescriptor = useRef<number[] | null>(null);

  // 4. Face Detection & Drawing Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming && isModelLoaded && stream && !capturedImage) {
      interval = setInterval(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== 4 || video.videoWidth === 0) return;
        
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptor(); // Get descriptor in loop
        
        const isDetected = !!detections;
        setFaceDetected(isDetected);

        let postureValid = false;
        let message = "Center Your Face";

        if (detections) {
          latestDescriptor.current = Array.from(detections.descriptor);
          const landmarks = detections.landmarks.positions;
          const nose = landmarks[30]; // Tip of nose
          const leftEye = landmarks[36];
          const rightEye = landmarks[45];
          
          const leftDist = nose.x - leftEye.x;
          const rightDist = rightEye.x - nose.x;
          const yawRatio = leftDist / rightDist;
          const expressions = detections.expressions;
          
          const isNeutral = expressions.neutral > 0.6 || expressions.happy > 0.2; 
          
          if (yawRatio < 0.45) {
            message = "Turn your head right";
          } else if (yawRatio > 2.2) {
            message = "Turn your head left";
          } else if (!isNeutral) {
            message = "Relax your face";
          } else {
            postureValid = true;
            message = "Perfect! Hold still...";
          }

          // Drawing Logic (Landmarks)
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // 1. Draw Static Ghost Guide (Template)
            const drawGhostGuide = () => {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
              ctx.setLineDash([5, 5]);
              ctx.lineWidth = 1;
              
              // Center of canvas
              const cx = canvas.width / 2;
              const cy = canvas.height / 2;
              
              // Draw a basic face oval template
              ctx.beginPath();
              ctx.ellipse(cx, cy, 110, 150, 0, 0, Math.PI * 2);
              ctx.stroke();
              
              // Draw static eyes/nose/mouth indicators
              ctx.setLineDash([]);
              ctx.beginPath();
              // Eyes
              ctx.arc(cx - 40, cy - 30, 5, 0, Math.PI * 2);
              ctx.arc(cx + 40, cy - 30, 5, 0, Math.PI * 2);
              // Nose
              ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 30);
              // Mouth
              ctx.moveTo(cx - 30, cy + 60); ctx.quadraticCurveTo(cx, cy + 70, cx + 30, cy + 60);
              ctx.stroke();
            };

            drawGhostGuide();

            if (detections && video.videoWidth > 0) {
              const dims = faceapi.matchDimensions(canvas, video, true);
              const resizedDetections = faceapi.resizeResults(detections, dims);
              const l = resizedDetections.landmarks.positions;
              
              ctx.strokeStyle = postureValid ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.3)";
              ctx.fillStyle = postureValid ? "#3b82f6" : "#ffffff";
              ctx.lineWidth = 1;

              const drawConnection = (indices: number[]) => {
                ctx.beginPath();
                ctx.moveTo(l[indices[0]].x, l[indices[0]].y);
                for (let i = 1; i < indices.length; i++) ctx.lineTo(l[indices[i]].x, l[indices[i]].y);
                ctx.stroke();
              };

              drawConnection([...Array(17).keys()]); // jaw
              drawConnection([36, 37, 38, 39, 40, 41, 36]); // eye
              drawConnection([42, 43, 44, 45, 46, 47, 42]); // eye
              drawConnection([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 48]); // mouth
              
              l.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI); ctx.fill();
              });
            }
          }
        } else {
          latestDescriptor.current = null;
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }

        setIsCorrectPosture(postureValid);
        setGuideMessage(message);

        if (postureValid) {
          if (!detectionStartTime.current) {
            detectionStartTime.current = Date.now();
          }
          const elapsed = Date.now() - detectionStartTime.current;
          const progress = Math.min((elapsed / AUTO_CAPTURE_DELAY) * 100, 100);
          setAutoCaptureProgress(progress);

          if (elapsed >= AUTO_CAPTURE_DELAY) {
            handleCapture();
          }
        } else {
          detectionStartTime.current = null;
          setAutoCaptureProgress(0);
        }
      }, 100);
    }
    return () => {
      clearInterval(interval);
      detectionStartTime.current = null;
      setAutoCaptureProgress(0);
    };
  }, [isStreaming, isModelLoaded, stream, capturedImage]);

  // 5. Capture Frame (Auto-Capture but Manual Confirm)
  const handleCapture = async () => {
    if (!videoRef.current || !isCorrectPosture || isRegistering || capturedImage || !latestDescriptor.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        
        // Use the descriptor we already have from the loop!
        setDescriptor(latestDescriptor.current);
        setCapturedImage(imageData);
        setGuideMessage("Facial Captured!");
        toast.success("Face captured! Please review.");
      }
    } catch (err) {
      toast.error("Capture failed");
    }
  };

  // 6. Manual Registration
  const handleConfirm = async () => {
    if (!descriptor) return;
    setIsRegistering(true);
    try {
      await registerFace(descriptor);
      setRegistrationComplete(true);
      toast.success("Face registered successfully!");
      
      // Stop stream
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register face");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRetake = () => {
    if (retakeCount >= MAX_RETAKES) {
      toast.error("Maximum retake limit reached.");
      return;
    }
    setRetakeCount(prev => prev + 1);
    setCapturedImage(null);
    setDescriptor(null);
    detectionStartTime.current = null;
    setAutoCaptureProgress(0);
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] space-y-8 relative z-10"
      >
        {/* Header / Logo Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center tracking-tighter">
            <span className="text-5xl font-black text-white">FRM</span>
            <span className="text-5xl font-black text-blue-600">AS</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
            Facial Recognition & Monitoring Access System
          </p>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mt-4" />
        </div>

        {/* Step Title & Retake Count */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-blue-600/90 tracking-tight">
            Step 2: Facial Registration
          </h2>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            {capturedImage ? "Preview Captured Image" : `${MAX_RETAKES - retakeCount} retakes left`}
          </p>
        </div>

        {/* Square Scanner Area */}
        <div className="relative w-full aspect-[4/5] flex items-center justify-center">
          <div className="relative w-full h-full rounded-[2.5rem] border-4 border-zinc-900 bg-zinc-950 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
            {/* Inner Border Glow */}
            <div className={cn(
              "absolute inset-0 rounded-[2.5rem] border-2 transition-all duration-500 z-20 pointer-events-none",
              isCorrectPosture ? "border-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]" : "border-zinc-800"
            )} />

            {/* Video / Captured Image */}
            <AnimatePresence mode="wait">
              {!capturedImage ? (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && stream) el.srcObject = stream;
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10"
                  />
                  {!isStreaming && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="captured"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full"
                >
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover scale-x-[-1]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Line */}
            {!capturedImage && isStreaming && isCorrectPosture && (
              <motion.div 
                animate={{ top: ["-10%", "110%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1/2 bg-gradient-to-b from-blue-500/20 to-transparent z-10 opacity-50"
              />
            )}

            {/* Face Guide Overlay (Spotlight Mask) */}
            {!capturedImage && isStreaming && (
              <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                {/* Dark Mask with Rounded Rect Hole */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" 
                     style={{ 
                       clipPath: "path('M 0 0 H 640 V 640 H 0 Z M 120 100 H 520 V 540 H 120 Z')",
                       clipRule: "evenodd"
                     }} 
                />
                
                {/* Glowing Rounded Border */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    borderColor: isCorrectPosture ? "#3b82f6" : "rgba(255,255,255,0.2)"
                  }}
                  className={cn(
                    "w-[260px] h-[340px] border-2 rounded-[2rem] transition-all duration-300 shadow-[0_0_0_4px_rgba(0,0,0,0.3)]",
                    isCorrectPosture && "shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  )}
                />
                
                {/* Text Guide */}
                <div className="absolute bottom-[10%] left-0 right-0 text-center">
                  <motion.p 
                    animate={faceDetected ? { y: [0, -4, 0] } : { y: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "text-[11px] font-black uppercase tracking-[0.3em] drop-shadow-md transition-colors px-4 py-1.5 rounded-full inline-block bg-black/40 backdrop-blur-md border border-white/10",
                      isCorrectPosture ? "text-blue-400 border-blue-500/30" : "text-white/80"
                    )}
                  >
                    {guideMessage}
                  </motion.p>
                </div>

                {/* Linear Auto-Capture Progress (Bottom) */}
                {isCorrectPosture && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${autoCaptureProgress}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-center space-y-6 pt-4">
          <AnimatePresence mode="wait">
            {isRegistering ? (
              <motion.div 
                key="registering"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm tracking-wide">Registering Face...</span>
                </div>
              </motion.div>
            ) : capturedImage ? (
              <motion.div 
                key="captured-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 w-full"
              >
                <div className="flex gap-4">
                  <Button 
                    onClick={handleRetake}
                    variant="secondary"
                    className="flex-1 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold border-none"
                    disabled={retakeCount >= MAX_RETAKES}
                  >
                    Retake ({MAX_RETAKES - retakeCount} left)
                  </Button>
                  <Button 
                    onClick={handleConfirm}
                    className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold border-none shadow-xl shadow-blue-900/20"
                  >
                    Confirm Registration
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="flex items-center gap-2 text-zinc-600"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">System Scanning</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Success Message Section */}
        <AnimatePresence>
          {registrationComplete && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 py-4"
            >
              <div className="flex flex-col items-center gap-3 text-emerald-500 font-bold">
                <CheckCircle2 className="w-12 h-12" />
                <span className="text-lg tracking-tight">Face Registered Successfully</span>
              </div>
              <Button 
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl shadow-blue-900/20 text-lg"
                onClick={() => window.location.href = "/dashboard"}
              >
                ENTER DASHBOARD
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative footer text */}
      <div className="absolute bottom-8 text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
        Biometric Enrollment Terminal v2.0
      </div>
    </div>
  );
}

