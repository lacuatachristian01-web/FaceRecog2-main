"use client";

import { useState } from "react";
import { joinRoom } from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Scan } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function JoinRoom() {
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setIsJoining(true);
    try {
      const result = await joinRoom(code);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("Joined room successfully!");
      setCode("");
      window.location.href = `/dashboard`;
    } catch (error: any) {
      toast.error(error.message || "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      {/* Header Branding */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-black tracking-tighter text-white mb-2 italic">
          FRM<span className="text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">AS</span>
        </h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-80">
          Facial Recognition & Monitoring Access System
        </p>
      </motion.div>

      {/* Futuristic Join Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative w-full max-w-sm"
      >
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
          {/* Inner Light Effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
          
          <form onSubmit={handleJoin} className="space-y-10">
            <div className="text-center space-y-4">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                Enter the Room Code provided by the Admin.
              </p>
              
              <div className="relative group">
                <Input
                  placeholder="••••••"
                  value={code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
                  className={cn(
                    "h-16 text-center text-3xl font-black tracking-[0.4em] bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-white/10 placeholder:tracking-normal",
                    code ? "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : ""
                  )}
                  maxLength={6}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isJoining || code.length < 6} 
              className="w-full h-14 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-black uppercase tracking-widest italic rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Join
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>

      {/* Footer Status */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">
          Awaiting Room Code from Admin...
        </p>
      </motion.div>
    </div>
  );
}
