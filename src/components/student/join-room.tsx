"use client";

import { useState } from "react";
import { joinRoom } from "@/services/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, ArrowRight, Loader2 } from "lucide-react";

export function JoinRoom() {
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setIsJoining(true);
    try {
      const result = await joinRoom(code);
      toast.success("Joined room successfully!");
      setCode("");
      // Redirect or refresh
      window.location.href = `/student/rooms/${result.roomId}`;
    } catch (error: any) {
      toast.error(error.message || "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="border-border bg-card max-w-md mx-auto shadow-lg">
      <CardHeader>
        <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
          <KeyRound className="text-primary h-6 w-6" />
        </div>
        <CardTitle className="text-foreground">Join a Room</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter the unique code provided by your instructor or admin to join an attendance session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="e.g. X8Y2Z9"
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
              className="text-center text-2xl font-mono tracking-widest bg-background border-input uppercase"
              maxLength={6}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isJoining || code.length < 6} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Room
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-xs text-center text-muted-foreground justify-center">
        Contact your administrator if you don't have a code.
      </CardFooter>
    </Card>
  );
}
