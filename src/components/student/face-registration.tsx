"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  ChevronLeft,
  User,
  Scan,
  RefreshCcw,
  ArrowRight
} from "lucide-react";
import { registerFace } from "@/services/face";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Step = "intro" | "scanning" | "captured" | "success";

export function FaceRegistration() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<Step>("intro");
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [guideMessage, setGuideMessage] = useState("Center Your Face");
  const [isCorrectPosture, setIsCorrectPosture] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
  const detectionStartTime = useRef<number | null>(null);
  
  const AUTO_CAPTURE_DELAY = 1500;

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
      setStep("scanning");
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Webcam access denied.");
      toast.error("Please allow camera access to continue.");
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsStreaming(false);
  };

  const latestDescriptor = useRef<number[] | null>(null);

  // 4. Face Detection Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "scanning" && isStreaming && isModelLoaded && stream) {
      interval = setInterval(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== 4 || video.videoWidth <= 0) return;
        
        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        const isDetected = !!detections;
        setFaceDetected(isDetected);

        // Drawing landmarks mesh
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (detections && video.videoWidth > 0 && video.videoHeight > 0) {
            const dims = faceapi.matchDimensions(canvas, video, true);
            if (dims.width > 0 && dims.height > 0) {
              const resizedDetections = faceapi.resizeResults(detections, dims);
              
              // Custom mesh drawing (white dots and lines)
              ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
              ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
              ctx.lineWidth = 1;
              
              const l = resizedDetections.landmarks.positions;
              
              // Draw points
              l.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, 2 * Math.PI);
                ctx.fill();
              });

            // Draw some connections for a "mesh" look
            const drawConnection = (indices: number[]) => {
              ctx.beginPath();
              ctx.moveTo(l[indices[0]].x, l[indices[0]].y);
              for (let i = 1; i < indices.length; i++) ctx.lineTo(l[indices[i]].x, l[indices[i]].y);
              ctx.stroke();
            };

            drawConnection([...Array(17).keys()]); // jaw
            drawConnection([36, 37, 38, 39, 40, 41, 36]); // left eye
            drawConnection([42, 43, 44, 45, 46, 47, 42]); // right eye
            drawConnection([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 48]); // mouth
            drawConnection([27, 28, 29, 30, 31, 32, 33, 34, 35]); // nose
          }
        }
      }

        let postureValid = false;
        let message = "Verifying your face....";

        if (detections) {
          latestDescriptor.current = Array.from(detections.descriptor);
          const landmarks = detections.landmarks.positions;
          const nose = landmarks[30];
          const leftEye = landmarks[36];
          const rightEye = landmarks[45];
          
          const leftDist = nose.x - leftEye.x;
          const rightDist = rightEye.x - nose.x;
          const yawRatio = leftDist / rightDist;
          
          if (yawRatio < 0.5) {
            message = "Turn your head right";
          } else if (yawRatio > 2.0) {
            message = "Turn your head left";
          } else {
            postureValid = true;
            message = "Verifying your face....";
          }
        } else {
          latestDescriptor.current = null;
          message = "No face detected";
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
      if (interval) clearInterval(interval);
    };
  }, [step, isStreaming, isModelLoaded, stream]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !latestDescriptor.current || video.readyState < 2 || video.videoWidth === 0) return;

    // Small delay to ensure the video frame is fully rendered and not black
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.95);
        
        if (imageData && imageData.length > 500) {
          setDescriptor(latestDescriptor.current);
          setCapturedImage(imageData);
          setStep("captured");
          stopVideo();
        } else {
          toast.error("Capture failed. Poor visibility.");
        }
      }
    } catch (err) {
      console.error("Capture failed:", err);
      toast.error("Capture error. Please retry.");
    }
  };

  const handleConfirm = async () => {
    if (!descriptor) return;
    setIsRegistering(true);
    try {
      await registerFace(descriptor);
      setStep("success");
      toast.success("Face registered successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to register face");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescriptor(null);
    startVideo();
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        
        <AnimatePresence mode="wait">
          {/* STEP 1: INTRO */}
          {step === "intro" && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
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

              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <User className="w-10 h-10 text-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Face Recognition</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                    Complete these steps to enroll your facial biometrics.
                  </p>
                </div>
              </div>

              {/* Guide Points */}
              <div className="grid grid-cols-1 gap-4 px-4">
                {[
                  { icon: <Scan className="w-4 h-4" />, text: "Center your face in the camera frame" },
                  { icon: <RefreshCcw className="w-4 h-4" />, text: "Ensure your environment is well-lit" },
                  { icon: <User className="w-4 h-4" />, text: "Remove glasses, masks or hats" },
                ].map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                      {item.icon}
                    </div>
                    <span className="text-xs text-zinc-300 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={startVideo}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-900/20"
                  disabled={!isModelLoaded}
                >
                  {isModelLoaded ? (
                    <div className="flex items-center gap-2">
                      <span>Start Registration</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading Models...</span>
                    </div>
                  )}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full h-12 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 font-semibold"
                >
                  Skip for now
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SCANNING */}
          {step === "scanning" && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-blue-600/90 tracking-tight">
                  Scanning Face
                </h2>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                  Position your face in the center
                </p>
              </div>

              {/* Circular GCash-style Scanner */}
              <div className="relative w-full flex flex-col items-center justify-center py-10">
                <div className="relative w-72 h-72">
                  {/* Progress Ring */}
                  <svg className="absolute inset-[-12px] w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg] z-20">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="144"
                      className="fill-none stroke-zinc-900 stroke-[4]"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="144"
                      initial={{ strokeDashoffset: 905 }}
                      animate={{ strokeDashoffset: 905 - (905 * (autoCaptureProgress || 0)) / 100 }}
                      style={{ strokeDasharray: 905 }}
                      transition={{ duration: 0.1 }}
                      className="fill-none stroke-blue-500 stroke-[4] stroke-round"
                    />
                  </svg>

                  {/* Camera Circle */}
                  <div className="relative w-full h-full rounded-full border-4 border-zinc-800 bg-zinc-950 overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.1)] z-10">
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

                    {/* Head Silhouette Guide (GCash style) */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <svg viewBox="0 0 200 200" className="w-[85%] h-auto text-white/20 fill-none stroke-current stroke-[1]">
                        <path d="M100,30 C130,30 155,60 155,100 C155,150 130,180 100,180 C70,180 45,150 45,100 C45,60 70,30 100,30 Z" />
                      </svg>
                    </div>

                    {/* Landmark Mesh (Very subtle) */}
                    <canvas 
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-30 opacity-40 grayscale"
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-30">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md transition-all duration-300",
                      faceDetected ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-zinc-900/50 border-white/5 text-zinc-500"
                    )}>
                      {faceDetected ? "Face Detected" : "Scanning..."}
                    </div>
                  </div>
                </div>

                <div className="mt-12 text-center space-y-3">
                  <h3 className="text-xl font-bold text-white tracking-tight">{guideMessage}</h3>
                  <p className="text-zinc-500 text-sm max-w-[240px] mx-auto leading-relaxed">
                    Position your face within the circle and follow the prompts.
                  </p>
                </div>
              </div>

              {/* Progress & Message Indicator */}
              <div className="text-center space-y-4">
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-white mb-2">
                    {Math.round(autoCaptureProgress)}%
                  </span>
                  <span className={cn(
                    "text-[10px] uppercase tracking-[0.3em] font-bold transition-colors",
                    isCorrectPosture ? "text-blue-400" : "text-zinc-600"
                  )}>
                    {guideMessage}
                  </span>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={() => { stopVideo(); setStep("intro"); }}
                  className="text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CAPTURED (Confirmation) */}
          {step === "captured" && (
            <motion.div 
              key="captured"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 flex flex-col items-center"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Verify Capture
                </h2>
                <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                  Identity Scanned
                </p>
              </div>

              {/* Circular Confirmation Frame */}
              <div className="relative w-72 h-72 rounded-full border-4 border-emerald-500/30 bg-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] flex items-center justify-center">
                {capturedImage ? (
                  <img 
                    key={capturedImage}
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover scale-x-[-1] block relative z-20" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-700">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Processing...</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-emerald-500/5 z-10 pointer-events-none" />
              </div>

              <div className="flex flex-col gap-4 w-full">
                <Button 
                  onClick={handleConfirm}
                  disabled={isRegistering}
                  className="w-full h-16 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black text-lg uppercase italic tracking-tighter"
                >
                  {isRegistering ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleRetake}
                  className="text-zinc-500 hover:text-white flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retake Photo
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-10"
            >
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <img 
                      src={capturedImage!} 
                      alt="Registered Face" 
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black rounded-full p-1.5 shadow-lg border-4 border-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Mission Success</h2>
                <p className="text-zinc-500 text-sm max-w-[280px] mx-auto">
                  Your facial profile is now registered. You're cleared for automated attendance.
                </p>
              </div>

              <Button 
                onClick={() => router.push("/dashboard")}
                className="w-full h-16 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black text-lg uppercase italic tracking-tighter"
              >
                Enter Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative background elements from original UI */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      
      <div className="absolute bottom-8 text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
        Biometric Enrollment Terminal v2.0
      </div>
    </div>
  );
}

