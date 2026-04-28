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
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Camera
} from "lucide-react";
import { registerFace } from "@/services/face";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Step = "intro" | "scanning" | "cropping" | "captured" | "success";

interface FaceRegistrationProps {
  onSuccess?: () => void;
  initialMode?: 'camera' | 'upload' | null;
  initialImage?: string | null;
  isReplacing?: boolean;
}

export function FaceRegistration({ onSuccess, initialMode, initialImage, isReplacing }: FaceRegistrationProps) {
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
  const [hasFailedRegistration, setHasFailedRegistration] = useState(false);
  const detectionStartTime = useRef<number | null>(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const AUTO_CAPTURE_DELAY = 800;

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

  // 1b. Handle initial mode bypass
  useEffect(() => {
    if (isModelLoaded) {
      if (initialImage) {
        // Direct process pre-loaded image
        const processPreloaded = async () => {
          setIsRegistering(true);
          const img = new Image();
          img.onload = async () => {
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection) {
              // AI-Powered Smart Face Cropping
              const { x, y, width: boxWidth, height: boxHeight } = detection.detection.box;
              
              // Expand the box slightly for a nice headshot (40% padding)
              const padding = 0.4;
              const cropX = Math.max(0, x - boxWidth * padding);
              const cropY = Math.max(0, y - boxHeight * (padding + 0.1)); // Shift up slightly for head
              const cropWidth = Math.min(img.width - cropX, boxWidth * (1 + padding * 2));
              const cropHeight = Math.min(img.height - cropY, boxHeight * (1 + padding * 2));
              
              // Make it a square
              const size = Math.min(cropWidth, cropHeight);
              
              const canvas = document.createElement("canvas");
              canvas.width = 400;
              canvas.height = 400;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, cropX, cropY, size, size, 0, 0, 400, 400);
                const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
                setCapturedImage(croppedBase64);
              } else {
                setCapturedImage(initialImage);
              }
              setDescriptor(Array.from(detection.descriptor));
            }
            
            setCroppingImage(initialImage);
            setStep("cropping");
            setIsRegistering(false);
          };
          img.src = initialImage;
        };
        processPreloaded();
      } else if (initialMode === 'camera') {
        startVideo();
      } else if (initialMode === 'upload') {
        fileInputRef.current?.click();
      }
    }
  }, [isModelLoaded, initialMode, initialImage]);

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

  const captureManual = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      
      setIsRegistering(true);
      try {
        const img = new Image();
        img.onload = async () => {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            setDescriptor(Array.from(detection.descriptor));
          }
          
          setCroppingImage(imageData);
          setStep("cropping");
          setIsRegistering(false);
          stopVideo();
        };
        img.src = imageData;
      } catch (err) {
        toast.error("Failed to capture photo");
        setIsRegistering(false);
      }
    }
  };
  const handleManualCrop = () => {
    if (!croppingImage) return;
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 400, 400);

      // Calculate source and destination
      const displaySize = 288; // size of the preview box
      const scale = (img.width / displaySize) / zoom;
      
      const sourceX = (img.width / 2 - position.x * scale) - (img.width / (2 * zoom));
      const sourceY = (img.height / 2 - position.y * scale) - (img.height / (2 * zoom));
      const sourceSize = img.width / zoom;

      ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 300, 300);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.7));
      setStep("captured");
    };
    img.src = croppingImage;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescriptor(null);
    setHasFailedRegistration(false);
    if (initialMode === 'upload' || initialImage) {
      fileInputRef.current?.click();
    } else {
      setStep("scanning");
      startVideo();
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    setIsRegistering(true);
    setHasFailedRegistration(false);
    try {
      await registerFace(descriptor || [], capturedImage);
      setStep("success");
      toast.success("Profile updated successfully!");
      router.refresh();
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      console.error("Registration Error Details (Full):", JSON.stringify(err, null, 2));
      const errorMessage = err?.message || "Failed to update profile";
      toast.error(errorMessage);
      setHasFailedRegistration(true);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRegistering(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            setDescriptor(Array.from(detection.descriptor));
            // Smart Crop
            const { x, y, width: boxWidth, height: boxHeight } = detection.detection.box;
            const padding = 0.4;
            const cropX = Math.max(0, x - boxWidth * padding);
            const cropY = Math.max(0, y - boxHeight * (padding + 0.1));
            const size = Math.min(boxWidth * (1 + padding * 2), boxHeight * (1 + padding * 2));
            
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, cropX, cropY, size, size, 0, 0, 400, 400);
              setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
            } else {
              setCapturedImage(event.target?.result as string);
            }
          } else {
            setCapturedImage(event.target?.result as string);
          }

          setStep("captured");
          setIsRegistering(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to process image");
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        
        <AnimatePresence mode="wait">
          {/* STEP 1: INTRO */}
          {step === "intro" && !initialMode && (
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/5" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-[#0c0c0e] px-2 text-zinc-600">Or</span>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                />
                
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-14 rounded-2xl border-white/10 bg-transparent hover:bg-white/5 text-white font-bold"
                  disabled={!isModelLoaded || isRegistering}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <span>Upload Photo</span>
                  </div>
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CAMERA */}
          {step === "scanning" && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                  Take a Photo
                </h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Selfie Mode
                </p>
              </div>

              <div className="relative w-full flex flex-col items-center justify-center py-4">
                <div className="relative w-72 h-72 rounded-2xl border-2 border-white/20 bg-zinc-950 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                  <video
                    ref={handleVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>

              <div className="text-center space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className={cn(
                    "text-[10px] uppercase tracking-[0.3em] font-bold transition-colors",
                    isCorrectPosture ? "text-blue-400" : "text-zinc-600"
                  )}>
                    {guideMessage}
                  </div>
                  
                  <button 
                    onClick={captureManual}
                    disabled={isRegistering}
                    className="w-20 h-20 rounded-full border-4 border-white/20 p-1 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center active:scale-95"
                  >
                    <div className="w-full h-full rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center">
                      <Camera className="w-8 h-8 text-black" />
                    </div>
                  </button>

                  <Button 
                    variant="ghost" 
                    onClick={() => { stopVideo(); setStep("intro"); }}
                    className="text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: CROPPING */}
          {step === "cropping" && croppingImage && (
            <motion.div 
              key="cropping"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight leading-none">
                  Adjust Photo
                </h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Drag to center & Zoom to scale
                </p>
              </div>

              <div className="relative w-full flex flex-col items-center gap-8">
                {/* Crop Box */}
                <div 
                  className="relative w-72 h-72 rounded-2xl border-2 border-blue-500/50 bg-zinc-950 overflow-hidden cursor-move touch-none shadow-[0_0_50px_rgba(59,130,246,0.1)]"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                >
                  <img 
                    src={croppingImage} 
                    alt="To Crop"
                    className="absolute max-w-none pointer-events-none select-none transition-transform duration-75"
                    style={{
                      width: '100%',
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 border border-white/5 pointer-events-none">
                    <div className="absolute inset-x-0 top-1/3 h-[0.5px] bg-white/20" />
                    <div className="absolute inset-x-0 top-2/3 h-[0.5px] bg-white/20" />
                    <div className="absolute inset-y-0 left-1/3 w-[0.5px] bg-white/20" />
                    <div className="absolute inset-y-0 left-2/3 w-[0.5px] bg-white/20" />
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="w-full space-y-3 px-8">
                  <div className="flex justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    <span>Zoom Level</span>
                    <span className="text-blue-500">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="0.05" 
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="flex gap-3 w-full px-8">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (initialMode === 'upload') {
                        setStep("intro");
                      } else {
                        setStep("scanning");
                        startVideo();
                      }
                    }}
                    className="flex-1 border-white/5 bg-white/5 hover:bg-zinc-900 text-zinc-400 h-11"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleManualCrop}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-11 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  >
                    Confirm Selection
                  </Button>
                </div>
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
                  Verify Photo
                </h2>
                <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                  Preview
                </p>
              </div>

              {/* Box Confirmation Frame */}
              <div className="relative w-72 h-72 rounded-2xl border-4 border-emerald-500/30 bg-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] flex items-center justify-center">
                {capturedImage ? (
                  <img 
                    key={capturedImage}
                    src={capturedImage} 
                    alt="Captured" 
                    className={cn(
                      "w-full h-full object-cover block relative z-20",
                      // Only mirror if it was a live camera capture
                      !initialImage && step !== "captured" && "scale-x-[-1]"
                    )} 
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
                  onClick={hasFailedRegistration ? handleRetake : handleConfirm}
                  disabled={isRegistering}
                  className={cn(
                    "w-full h-16 rounded-2xl text-white font-black text-lg uppercase italic tracking-tighter",
                    hasFailedRegistration 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isRegistering ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : hasFailedRegistration ? (
                    "Failed to create face, retake it"
                  ) : isReplacing ? (
                    "Confirm to Replace"
                  ) : (
                    "Confirm Photo"
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleRetake}
                  className="text-zinc-500 hover:text-white flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  {initialMode === 'upload' || initialImage ? "Edit Photo" : "Retake Photo"}
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

              <div className="flex flex-col gap-3 w-full">
                <Button 
                  onClick={() => onSuccess?.()} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-[11px]"
                >
                  Done
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setStep("intro");
                    setCapturedImage(null);
                    setCroppingImage(null);
                    setDescriptor(null);
                  }}
                  className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest"
                >
                  Change Photo Again
                </Button>
              </div>
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

