"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { registerFace } from "@/services/face";

export function FaceRegistration() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 2. Start webcam
  const startVideo = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Webcam access denied. Please enable camera permissions.");
      toast.error("Camera access denied");
    }
  };

  // 3. Capture and Register
  const handleCapture = async () => {
    if (!videoRef.current || !isModelLoaded) return;

    setIsRegistering(true);
    try {
      // Detect single face
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        toast.error("No face detected. Please ensure your face is visible.");
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
      <Card className="max-w-md mx-auto text-center border-border bg-card">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Registration Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your facial biometrics have been securely registered. You can now use facial recognition for attendance.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => window.location.href = "/dashboard"} className="bg-primary text-primary-foreground">
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-border bg-card overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Face Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
          {!isStreaming ? (
            <div className="text-center p-6">
              <p className="text-muted-foreground mb-4">
                Position your face clearly in the frame for registration.
              </p>
              <Button onClick={startVideo} disabled={!isModelLoaded} className="bg-primary">
                {!isModelLoaded ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Models...
                  </>
                ) : (
                  "Start Camera"
                )}
              </Button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
          
          {isRegistering && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-2" />
                <p className="text-foreground font-medium">Scanning Face...</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure good lighting on your face.</li>
            <li>Remove glasses or hats if possible.</li>
            <li>Keep a neutral expression.</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border pt-6">
        {isStreaming && (
          <Button variant="outline" onClick={startVideo} disabled={isRegistering}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Camera
          </Button>
        )}
        <Button 
          onClick={handleCapture} 
          disabled={!isStreaming || isRegistering}
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8"
        >
          {isRegistering ? "Processing..." : "Register My Face"}
        </Button>
      </CardFooter>
    </Card>
  );
}
