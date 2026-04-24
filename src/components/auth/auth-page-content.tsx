'use client';

import { useState, useEffect } from 'react';
import { signInWithID, signUpWithID } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  Check, 
  Hash, 
  GraduationCap, 
  Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function AuthPageContent() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [courseYear, setCourseYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student');
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('df_auth_mode');
    if (saved) setMode(saved as 'login' | 'signup');
  }, []);

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    localStorage.setItem('df_auth_mode', m);
    setError('');
    setSuccess(false);
    setId('');
    setCourseYear('');
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await signInWithID(name, id);
        setSuccess(true);
        setTimeout(() => {
          toast.success('Login successful!');
          router.push('/dashboard');
          router.refresh();
        }, 800);
      } else {
        await signUpWithID(name, id, userRole, courseYear);
        setSuccess(true);
        setTimeout(() => {
          toast.success('Account created!', { description: 'Welcome to the system!' });
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden selection:bg-primary/30">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.2, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px]"
        />
        <motion.div 
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[10%] -left-[5%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]"
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* Brand Side - Desktop Only */}
        <div className="hidden lg:flex w-[450px] shrink-0 flex-col justify-between p-12 border-r border-border bg-card/30 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-16">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                F
              </div>
              <span className="text-xl font-bold tracking-tight">Facial Automated Attendance</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight mb-6">
              Automated Attendance.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-shimmer">
                Powered by AI.
              </span>
            </h1>

            <p className="text-muted-foreground leading-relaxed max-w-xs mb-10">
              A high-performance facial recognition system built for schools and businesses.
            </p>

            {/* Features List */}
            <div className="space-y-4">
              {[
                'Next.js 15 & Supabase Integration',
                'Real-time Facial Recognition',
                'Secure RLS Data Protection',
                'Advanced Admin Dashboard'
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  key={feature} 
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Check size={12} />
                  </div>
                  <span className="text-sm text-muted-foreground/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 relative z-10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">All Systems Live</span>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 space-y-3 text-center">
              <h2 className="text-4xl font-black tracking-tight text-foreground">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-shimmer">
                  {mode === 'login' ? 'Welcome Back' : 'Join our Community'}
                </span>
              </h2>
              <p className="text-muted-foreground font-medium">
                {mode === 'login' 
                  ? 'Sign in to continue your attendance tracking.' 
                  : "We're excited to have you join our attendance system!"}
              </p>
            </div>

            <Tabs value={mode} onValueChange={(v) => switchMode(v as any)} className="w-full mb-8">
              <TabsList className="w-full grid grid-cols-2 h-11">
                <TabsTrigger value="login" className="text-sm font-semibold">Login</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-semibold">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                    <Check size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Success!</h3>
                    <p className="text-sm text-muted-foreground">
                      {mode === 'login' ? 'Glad to see you again! Taking you to your dashboard...' : 'Your account is ready! You can now sign in.'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {mode === 'signup' && (
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        I am a...
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={userRole === 'student' ? 'default' : 'outline'}
                          onClick={() => setUserRole('student')}
                          className="h-12 gap-2 rounded-xl"
                        >
                          <GraduationCap size={18} />
                          Student
                        </Button>
                        <Button
                          type="button"
                          variant={userRole === 'admin' ? 'default' : 'outline'}
                          onClick={() => setUserRole('admin')}
                          className="h-12 gap-2 rounded-xl"
                        >
                          <Briefcase size={18} />
                          Admin
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Full Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          placeholder="Juan Dela Cruz"
                          className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        ID Number
                      </label>
                      <div className="relative group">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          placeholder="e.g. 231-0726"
                          className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                          value={id}
                          onChange={(e) => setId(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {mode === 'signup' && userRole === 'student' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                          Course & Year
                        </label>
                        <div className="relative group">
                          <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            placeholder="BSCS 4A"
                            className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                            value={courseYear}
                            onChange={(e) => setCourseYear(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-[13px] text-destructive bg-destructive/5 border border-destructive/10 px-4 py-2.5 rounded-lg">
                      {error}
                    </p>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-card/30 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-muted-foreground/60 tracking-wide font-medium">
          © 2026 FACE RECOGNITION SYSTEM • BUILT FOR SPEED
        </p>
        <div className="flex items-center gap-6">
          {['Privacy', 'Terms', 'Docs'].map((item) => (
            <Link 
              key={item} 
              href="#" 
              className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors uppercase tracking-widest font-bold"
            >
              {item}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
