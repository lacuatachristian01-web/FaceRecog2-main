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
  Camera,
  AlertTriangle
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
  registrationType?: 'biometric' | 'simple';
}

export function FaceRegistration({ onSuccess, initialMode, initialImage, isReplacing, registrationType = 'biometric' }: FaceRegistrationProps) {
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
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const detectionStartTime = useRef<number | null>(null);
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

  // 1b. Handle initial camera start
  useEffect(() => {
    if (isModelLoaded && initialMode === 'camera') {
      startVideo();
    }
  }, [isModelLoaded, initialMode]);

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

  // 2. Real-time Detection Loop (ONLY for biometric mode)
  useEffect(() => {
    let interval: any;
    if (registrationType === 'biometric' && isStreaming && isModelLoaded && step === "scanning") {
      interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        
        const video = videoRef.current;
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320, // Better balance for finding faces
            scoreThreshold: 0.15 // Very sensitive to low-light/distant faces
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);
          
          const { x, y, width, height } = detection.detection.box;
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          
          const isCenteredX = Math.abs(centerX - videoWidth / 2) < videoWidth * 0.10; // Tightened for accuracy
          const isCenteredY = Math.abs(centerY - videoHeight / 2) < videoHeight * 0.10; // Tightened for accuracy
          
          // Accuracy Enhancement: Check Face Size relative to frame (approx 35-65% is ideal)
          const faceScale = detection.detection.box.width / videoWidth;
          const isCorrectSize = faceScale > 0.35 && faceScale < 0.65;
          
          const isCorrectPosition = isCenteredX && isCenteredY && isCorrectSize;
          
          const landmarks = detection.landmarks;
          const nose = landmarks.getNose();
          const mouth = landmarks.getMouth();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const leftEyebrow = landmarks.getLeftEyeBrow();

          // Precision Check: Face Leveling (Eyes must be aligned horizontally)
          const eyeDeltaY = Math.abs(leftEye[0].y - rightEye[0].y);
          const isLeveled = eyeDeltaY < (detection.detection.box.height * 0.05); // Increased from 0.02 for easier leveling

          // Precision Check: Head Rotation (Yaw)
          const distToLeftEye = Math.abs(nose[0].x - leftEye[0].x);
          const distToRightEye = Math.abs(nose[0].x - rightEye[0].x);
          const isLookingStraight = Math.abs(distToLeftEye - distToRightEye) < (distToLeftEye * 0.25);

          // Security Check: Specific Accessory Detection
          const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
          const mouthHeight = Math.abs(mouth[9].y - mouth[3].y);
          const isMaskSuspected = mouthHeight < 1 || (detection.detection.score < 0.88 && mouthHeight < 3);
          const eyeToTopDist = Math.abs(leftEyebrow[0].y - detection.detection.box.y);
          const isCapSuspected = eyeToTopDist < (detection.detection.box.height * 0.10);
          const isGlassesSuspected = detection.detection.score > 0.82 && detection.detection.score <= 0.90 && !isMaskSuspected && !isCapSuspected;

          const isHighConfidence = detection.detection.score > 0.91;
          
          if (isCenteredX && isCenteredY) {
            /* Relaxed Posture: Allow capture even if not perfectly leveled or looking straight */
            /* 
            if (!isLeveled) {
              setIsCorrectPosture(false);
              setGuideMessage("LEVEL YOUR FACE");
              setAutoCaptureProgress(prev => Math.max(0, prev - 5)); 
              return;
            }
            if (!isLookingStraight) {
              setIsCorrectPosture(false);
              setGuideMessage("LOOK DIRECTLY AT CAMERA");
              setAutoCaptureProgress(prev => Math.max(0, prev - 5));
              return;
            }
            */

            // Priority 2: Specific Accessory Red Warnings
            if (isMaskSuspected) {
              setIsCorrectPosture(false);
              setGuideMessage("REMOVE YOUR MASK");
              setAutoCaptureProgress(prev => Math.max(0, prev - 10));
              return;
            }
            if (isCapSuspected) {
              setIsCorrectPosture(false);
              setGuideMessage("REMOVE YOUR CAP");
              setAutoCaptureProgress(prev => Math.max(0, prev - 10));
              return;
            }
            if (isGlassesSuspected) {
              setIsCorrectPosture(false);
              setGuideMessage("REMOVE YOUR EYEGLASSES/SUNGLASSES");
              setAutoCaptureProgress(prev => Math.max(0, prev - 10));
              return;
            }

            if (!isHighConfidence) {
              setIsCorrectPosture(false);
              setGuideMessage("FACE OBSCURED - CLEAR FACE");
              setAutoCaptureProgress(prev => Math.max(0, prev - 5));
              return;
            }

            setIsCorrectPosture(true);
            setGuideMessage(autoCaptureProgress > 50 ? "HOLD STILL..." : "FACE DETECTED - STAY STILL");
            
            setAutoCaptureProgress(prev => {
              const next = prev + 25; // 4 frames to capture (approx 320ms) - Snappier
              if (next >= 100) {
                setTimeout(() => {
                  clearInterval(interval);
                  handleAutoCapture(detection);
                }, 0);
                return 100;
              }
              return next;
            });
          } else {
            setIsCorrectPosture(false);
            if (!isCorrectSize) {
              setGuideMessage(faceScale < 0.35 ? "MOVE CLOSER TO CAMERA" : "MOVE FURTHER BACK");
            } else {
              setGuideMessage("CENTER YOUR FACE IN THE FRAME");
            }
            setAutoCaptureProgress(prev => Math.max(0, prev - 10));
          }
        } else {
          setIsCorrectPosture(false);
          setGuideMessage("Finding face...");
          setAutoCaptureProgress(prev => Math.max(0, prev - 15));
        }
      }, 80); // Balanced interval for CPU reliability
    }
    return () => clearInterval(interval);
  }, [isStreaming, isModelLoaded, step, registrationType]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth <= 0) {
      toast.error("Video not ready. Please wait.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Mirror the video for capture
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      
      // Try to detect face for biometric purposes
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setDescriptor(Array.from(detection.descriptor));
      }

      setCroppingImage(imageData);
      setStep("cropping");
      stopVideo();
    }
  };

  const handleAutoCapture = async (detection: any) => {
    if (!videoRef.current || isRegistering) return;
    
    const video = videoRef.current;
    
    // Safety check for video readiness before capture
    if (video.readyState < 2 || video.videoWidth <= 0) {
      console.warn("[FaceRegistration] Video not ready for auto-capture");
      return;
    }

    setIsRegistering(true);
    setGuideMessage("Processing Biometrics...");
    
    const canvas = document.createElement("canvas");
    const targetSize = 256; 
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Mirror crop
      ctx.scale(-1, 1);
      
      // Calculate crop from detection box
      const { x, y, width, height } = detection.detection.box;
      
      // Safety check for valid dimensions
      if (width <= 0 || height <= 0 || video.videoWidth <= 0) {
        console.warn("[FaceRegistration] Invalid dimensions detected for capture:", { width, height, videoWidth: video.videoWidth });
        setIsRegistering(false);
        setStep("scanning");
        startVideo(); // Restart if failed
        return;
      }

      const padding = 0.4;
      const size = Math.max(1, Math.min(width * (1 + padding * 2), height * (1 + padding * 2)));
      const cropX = Math.max(0, x - width * padding);
      const cropY = Math.max(0, y - height * padding);

      // 1. Ensure canvas is clean
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetSize, targetSize);
      
      // 2. Draw the video frame
      // We use a simple draw first to ensure the buffer is active
      try {
        const padding = 0.3; // Slightly tighter padding for better face focus
        const size = Math.max(1, Math.min(width * (1 + padding * 2), height * (1 + padding * 2)));
        const cropX = Math.max(0, x - width * padding);
        const cropY = Math.max(0, y - height * padding);

        ctx.drawImage(video, cropX, cropY, size, size, 0, 0, targetSize, targetSize);
        
        // 3. Generate high-quality JPEG
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        
        // 4. Force state update with a fresh timestamp if needed to bypass cache
        setCapturedImage(imageData);
        setDescriptor(Array.from(detection.descriptor));
        
        // 5. Transition to preview
        setStep("captured");
        setIsRegistering(false);
        stopVideo();
      } catch (drawError) {
        console.error("Canvas Draw Error:", drawError);
        // Fallback: just take the whole frame if crop fails
        ctx.drawImage(video, 0, 0, targetSize, targetSize);
        setCapturedImage(canvas.toDataURL("image/jpeg", 0.8));
        setStep("captured");
        setIsRegistering(false);
        stopVideo();
      }
    }
  };

  const handleVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
    }
  };

  const handleReEdit = () => {
    setHasFailedRegistration(false);
    setRegistrationError(null);
    setStep("cropping");
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescriptor(null);
    setHasFailedRegistration(false);
    setRegistrationError(null);
    setAutoCaptureProgress(0);
    setFaceDetected(false);
    setIsCorrectPosture(false);
    setGuideMessage("Center Your Face");
    setStep("scanning");
    startVideo();
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    setIsRegistering(true);
    setHasFailedRegistration(false);
    try {
      const result = await registerFace(descriptor || [], capturedImage);
      
      if (result.error) {
        throw new Error(result.error);
      }

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

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setCroppingImage(imageData);
      setStep("cropping");
      
      // Try to detect face in the uploaded image
      const img = new Image();
      img.onload = async () => {
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setDescriptor(Array.from(detection.descriptor));
        }
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    if (!croppingImage) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Simple crop logic based on zoom and position
        // In a real app, you'd use a library like react-easy-crop
        // Here we simulate it with the current zoom/pos state
        const sourceSize = Math.min(img.width, img.height) / zoom;
        const sourceX = (img.width - sourceSize) / 2 - (crop.x * (img.width / 100));
        const sourceY = (img.height - sourceSize) / 2 - (crop.y * (img.height / 100));
        
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 400, 400);
        setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
        setStep("captured");
      }
    };
    img.src = croppingImage;
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
                  {registrationType === 'biometric' 
                    ? "Facial Recognition & Monitoring Access System"
                    : "Profile Photo Management (v2.1)"}
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
                  <h2 className="text-2xl font-bold text-white">
                    {registrationType === 'biometric' ? "Face Recognition" : "Profile Photo"}
                  </h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                    {registrationType === 'biometric' 
                      ? "Complete these steps to enroll your facial biometrics."
                      : "Update your profile image for your identification card."}
                  </p>
                </div>
              </div>

              {registrationType === 'biometric' && (
                <div className="grid grid-cols-1 gap-3 px-4">
                  {[
                    { icon: <Scan className="w-4 h-4" />, text: "Center your face in the camera frame" },
                    { icon: <RefreshCcw className="w-4 h-4" />, text: "Ensure your environment is well-lit" },
                    { icon: <User className="w-4 h-4" />, text: "Remove glasses, masks or hats" },
                  ].map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i}
                      className="flex items-center gap-5 p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-inner group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="text-xs text-zinc-200 font-bold tracking-tight">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}



              <div className="flex flex-col gap-4 pt-4 px-4">
                <Button 
                  onClick={startVideo}
                  className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-900/20"
                  disabled={!isModelLoaded}
                >
                  <div className="flex items-center gap-3">
                    {registrationType === 'biometric' ? <Scan className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                    <span>{registrationType === 'biometric' ? "Start Enrollment" : "Take Photo"}</span>
                  </div>
                </Button>
                
                {registrationType === 'simple' && (
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full h-16 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-lg"
                  >
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                      <span>Upload Photo</span>
                    </div>
                  </Button>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 flex flex-col items-center"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                  {registrationType === 'biometric' ? "Verify Identity" : "Camera"}
                </h2>
                {registrationType === 'biometric' && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                      Keep your head within the circle
                    </p>
                  </div>
                )}
              </div>

              <div className="relative w-full flex flex-col items-center justify-center">
                {registrationType === 'biometric' ? (
                  /* BIOMETRIC MODE: Circular GCash Style Frame */
                  <div className="relative w-80 h-80">
                    {/* Progress Border SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                      <rect
                        x="10"
                        y="10"
                        width="300"
                        height="300"
                        rx="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <motion.rect
                        x="10"
                        y="10"
                        width="300"
                        height="300"
                        rx="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="1200"
                        initial={{ strokeDashoffset: 1200 }}
                        animate={{ 
                          strokeDashoffset: 1200 - (1200 * (autoCaptureProgress / 100)),
                          color: autoCaptureProgress > 80 ? "#10b981" : isCorrectPosture ? "#3b82f6" : "#ef4444",
                          scale: autoCaptureProgress > 90 ? [1, 1.02, 1] : 1
                        }}
                        strokeLinecap="round"
                        transition={{ duration: 0.1, ease: "linear" }}
                        className="origin-center"
                      />
                    </svg>

                    {/* Video Container (Square) */}
                    <div className={cn(
                      "absolute inset-4 rounded-[40px] border-4 overflow-hidden bg-zinc-950 transition-all duration-500 z-20",
                      faceDetected ? "border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]" : "border-white/10"
                    )}>
                      <video
                        ref={handleVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />

                      {/* Top Floating Instruction Badge */}
                      <div className="absolute top-6 left-0 w-full flex justify-center z-50">
                        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                          <AlertTriangle className="w-2.5 h-2.5 text-yellow-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">No Glasses / No Mask</span>
                        </div>
                      </div>

                      {/* Face Silhouette Guide */}
                      <div className={cn(
                        "absolute inset-0 pointer-events-none z-20 flex items-center justify-center transition-all duration-300",
                        isCorrectPosture ? "opacity-60 scale-105 text-emerald-500" : "opacity-20 text-white"
                      )}>
                        <svg viewBox="0 0 100 100" className="w-[80%] h-[80%]">
                          <path 
                            d="M50,15 C35,15 25,28 25,45 C25,62 35,85 50,85 C65,85 75,62 75,45 C75,28 65,15 50,15 Z" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth={isCorrectPosture ? "2" : "1"} 
                            strokeDasharray={isCorrectPosture ? "none" : "4 4"}
                            className="transition-all duration-300"
                          />
                          <path d="M40,40 Q40,38 42,38 Q44,38 44,40" fill="none" stroke="currentColor" strokeWidth="1" />
                          <path d="M56,40 Q56,38 58,38 Q60,38 60,40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </div>

                      {/* Scanning Line Effect */}
                      <AnimatePresence>
                        {faceDetected && (
                          <motion.div 
                            initial={{ top: "-10%" }}
                            animate={{ top: "110%" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 w-full h-20 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent pointer-events-none border-t border-blue-500/40"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Corner Accents */}
                    <div className="absolute -top-2 -left-2 w-10 h-10 border-t-4 border-l-4 border-blue-600 rounded-tl-3xl z-40 opacity-50" />
                    <div className="absolute -top-2 -right-2 w-10 h-10 border-t-4 border-r-4 border-blue-600 rounded-tr-3xl z-40 opacity-50" />
                    <div className="absolute -bottom-2 -left-2 w-10 h-10 border-b-4 border-l-4 border-blue-600 rounded-bl-3xl z-40 opacity-50" />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b-4 border-r-4 border-blue-600 rounded-br-3xl z-40 opacity-50" />
                  </div>
                ) : (
                  /* SIMPLE MODE: Standard Rectangular Camera */
                  <div className="relative w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden border-4 border-white/10 bg-zinc-950 shadow-2xl">
                    <video
                      ref={handleVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    
                    {/* Subtle Grid Lines like a real camera */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="absolute top-1/3 w-full h-[1px] bg-white/30" />
                      <div className="absolute top-2/3 w-full h-[1px] bg-white/30" />
                      <div className="absolute left-1/3 h-full w-[1px] bg-white/30" />
                      <div className="absolute left-2/3 h-full w-[1px] bg-white/30" />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center w-full max-w-[300px] space-y-10">
                <div className="space-y-3">
                  {registrationType === 'biometric' && (
                    <motion.div 
                      key={guideMessage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "text-xs font-black uppercase tracking-tighter italic",
                        guideMessage.includes("REMOVE") || guideMessage.includes("OBSCURED") 
                          ? "text-red-500 animate-pulse" 
                          : faceDetected ? "text-blue-400" : "text-zinc-500"
                      )}
                    >
                      {guideMessage}
                    </motion.div>
                  )}
                  
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-relaxed">
                    {registrationType === 'biometric' 
                      ? "Look directly at the camera and avoid blinking for a second."
                      : "Tap the shutter to capture"}
                  </p>
                </div>
                
                <div className="flex flex-col gap-4 w-full">
                  {registrationType === 'simple' && (
                    <div className="flex items-center justify-center gap-4">
                      <Button 
                        onClick={handleCapture}
                        className="w-20 h-20 rounded-full bg-white hover:bg-zinc-200 border-8 border-blue-600/20 shadow-2xl flex items-center justify-center"
                      >
                        <div className="w-12 h-12 rounded-full border-4 border-blue-600" />
                      </Button>
                    </div>
                  )}

                  {registrationType === 'biometric' && (
                    <div className="h-10 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 px-6">
                      {faceDetected ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500 mr-3" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse mr-3" />
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">
                        {autoCaptureProgress > 0 ? `Capturing... ${Math.round(autoCaptureProgress)}%` : faceDetected ? "Adjusting Posture..." : "Waiting for Face..."}
                      </span>
                    </div>
                  )}



                  <Button 
                    variant="ghost" 
                    onClick={() => { stopVideo(); setStep("intro"); }}
                    className="text-zinc-600 hover:text-white uppercase text-[10px] font-black tracking-widest"
                  >
                    Cancel Session
                  </Button>
                </div>
              </div>
            </motion.div>
          )}


          {/* STEP 2b: CROPPING */}
          {step === "cropping" && croppingImage && (
            <motion.div 
              key="cropping"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 flex flex-col items-center"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight italic">Adjust Photo</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Drag to position & scale</p>
              </div>

              <div className="relative w-80 h-80 rounded-2xl border-4 border-white/10 bg-zinc-900 overflow-hidden shadow-2xl group cursor-move">
                <motion.div
                  drag
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                  onDrag={(e, info) => setCrop({ x: info.offset.x, y: info.offset.y })}
                  className="w-full h-full flex items-center justify-center"
                >
                  <img 
                    src={croppingImage} 
                    style={{ transform: `scale(${zoom})` }}
                    className="max-w-none w-full h-auto"
                    alt="Cropping"
                  />
                </motion.div>
                
                {/* Visual Guide Overlay */}
                <div className="absolute inset-0 border-[30px] border-black/60 pointer-events-none">
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-3xl" />
                </div>
              </div>

              {/* Zoom Control */}
              <div className="w-full px-8 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Zoom</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.1" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-blue-600 h-1 rounded-full bg-zinc-800 appearance-none"
                  />
                  <span className="text-[10px] font-bold text-white">{zoom.toFixed(1)}x</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full px-4">
                <Button 
                  onClick={applyCrop}
                  className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg uppercase italic tracking-tighter"
                >
                  Apply & Continue
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setCroppingImage(null);
                    setStep("intro");
                  }}
                  className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest"
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
                  Verify Photo
                </h2>
                <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                  Preview
                </p>
              </div>

              {/* Box Confirmation Frame */}
              <div className="relative w-72 h-72 rounded-3xl border-4 border-emerald-500/30 bg-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] flex items-center justify-center">
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
                
                {/* Registration Overlay */}
                <AnimatePresence>
                  {isRegistering && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                    >
                      <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                        <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-black text-white uppercase italic tracking-tighter">Syncing Biometrics</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Enrolling Secure Profile</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-emerald-500/5 z-10 pointer-events-none" />
              </div>

              <div className="flex flex-col gap-4 w-full">
                {hasFailedRegistration && registrationError?.toLowerCase().includes("already registered") ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Security Alert</h3>
                          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                            {registrationError}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleRetake}
                      className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg uppercase italic tracking-tighter shadow-xl shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Make Another Registration
                    </Button>
                  </motion.div>
                ) : (
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
                      "Registration Failed"
                    ) : isReplacing ? (
                      "Confirm to Replace"
                    ) : (
                      "Confirm Photo"
                    )}
                  </Button>
                )}

                {/* Always show retake option in captured step */}
                <div className="flex flex-col gap-2 mt-4">
                  {registrationType === 'simple' && registrationError !== "This Face is Already Registered!" && (
                    <Button 
                      variant="ghost" 
                      onClick={handleReEdit}
                      className="text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Re-edit Photo
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    onClick={handleRetake}
                    className="text-zinc-500 hover:text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {registrationError === "This Face is Already Registered!" ? "Try Different Face" : "Retake Photo"}
                  </Button>
                </div>
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
                  <div className="w-32 h-32 rounded-3xl border-4 border-emerald-500/30 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)]">
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
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">
                  {registrationType === 'biometric' ? "Mission Success" : "Photo Updated"}
                </h2>
                <p className="text-zinc-500 text-sm max-w-[280px] mx-auto">
                  {registrationType === 'biometric' 
                    ? "Your facial profile is now registered. You're cleared for automated attendance."
                    : "Your profile photo has been updated successfully."}
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
        {registrationType === 'biometric' ? "Biometric Enrollment Terminal v2.0" : "Photo Management Terminal v2.1"}
      </div>
    </div>
  );
}

