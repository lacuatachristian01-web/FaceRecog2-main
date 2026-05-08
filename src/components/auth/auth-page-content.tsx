'use client';

import { useState, useEffect } from 'react';
import { signInWithID, signUpWithID } from '@/services/auth';
import { getUserProfile } from '@/services/dashboard';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  User, 
  Hash, 
  GraduationCap, 
  Briefcase,
  Loader2,
  ChevronRight,
  Fingerprint,
  Cpu,
  ShieldCheck,
  Database,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FaceRegistration } from '@/components/student/face-registration';
import { Badge } from '@/components/ui/badge';

export function AuthPageContent({ session }: { session?: any }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup'); // Default to signup as in image
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [courseYear, setCourseYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student');
  const [step, setStep] = useState<'welcome' | 'info' | 'face'>('welcome');
  const router = useRouter();

  // Check for existing student session needing face registration
  useEffect(() => {
    if (session?.user && session.profile?.role === 'student' && !session.profile?.face_registered) {
      setStep('face');
    }
  }, [session]);

  useEffect(() => {
    const saved = localStorage.getItem('df_auth_mode');
    if (saved) setMode(saved as 'login' | 'signup');
  }, []);

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    localStorage.setItem('df_auth_mode', m);
    setId('');
    setCourseYear('');
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signInWithID(name, id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Login successful!');
        
        // Fetch profile to check if face registration is needed
        const sessionData = await getUserProfile();
        if (sessionData?.profile?.role === 'student' && !sessionData.profile?.face_registered) {
          setStep('face');
          toast.info('Please complete facial registration.');
          router.refresh();
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } else {
        const result = await signUpWithID(name, id, userRole, courseYear);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Account created!', { 
          description: userRole === 'student' ? 'Please complete facial registration.' : 'Taking you to dashboard...' 
        });
        
        if (userRole === 'student') {
          setStep('face');
          router.refresh();
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-5xl space-y-12 relative z-10 py-6"
          >
            {/* Header Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/30 border border-blue-800/50 rounded-full text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest"
              >
                <Fingerprint size={12} className="text-blue-400 animate-pulse" />
                Christian Dev Labs (CDL)
              </motion.div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-none">
                FRM<span className="text-blue-500">AS</span>
              </h1>
              
              <h2 className="text-lg md:text-xl font-bold text-zinc-300">
                Facial Recognition Monitoring Attendance System
              </h2>
              
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto">
                A high-performance biometric ecosystem designed for educational and corporate environments to eliminate lost records and bookkeeping latency.
              </p>
            </div>

            {/* Core User Profiles (Student / Admin Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Student Portal Card */}
              <motion.div
                whileHover={{ y: -5, borderColor: "rgba(59, 130, 246, 0.4)" }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 space-y-4 backdrop-blur-sm shadow-xl shadow-black/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-800/40 text-blue-400">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400/80">User Profile</span>
                    <h3 className="text-xl font-black text-white">Student Portal</h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Secure biometric signup & high-accuracy face enrollment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Hands-free terminal clock-in with instant recognition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Personal dashboard with real-time logs & history</span>
                  </li>
                </ul>
              </motion.div>

              {/* Admin Command Card */}
              <motion.div
                whileHover={{ y: -5, borderColor: "rgba(59, 130, 246, 0.4)" }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 space-y-4 backdrop-blur-sm shadow-xl shadow-black/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-800/40 text-blue-400">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400/80">User Profile</span>
                    <h3 className="text-xl font-black text-white">Admin Dashboard</h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Classrooms setup with custom AM/PM windows</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>One-click student biometric approvals panel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Real-time logs & auto-calculated fine tracking</span>
                  </li>
                </ul>
              </motion.div>
            </div>

            {/* Core Tech Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="flex gap-3 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 items-center">
                <div className="text-blue-500"><Cpu size={20} /></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Biometrics Engineering</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">High-throughput descriptor extraction</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 items-center">
                <div className="text-blue-500"><ShieldCheck size={20} /></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Type-Safe Security</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">RLS-enforced data governance</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 items-center">
                <div className="text-blue-500"><Database size={20} /></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero-Latency Matching</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Optimized Supabase pgvector</p>
                </div>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="text-center pt-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
                <Button
                  onClick={() => setStep('info')}
                  className="h-14 px-8 text-lg font-black rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white shadow-2xl shadow-blue-500/20 border-none flex items-center gap-3 transition-all min-w-[200px]"
                >
                  Get Started
                  <ArrowRight size={18} className="animate-pulse" />
                </Button>
              </motion.div>
            </div>

            {/* Technology Stack */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-zinc-900 max-w-2xl mx-auto">
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mr-2">Built With:</span>
              <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/50 py-1 px-2.5">Next.js 15</Badge>
              <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/50 py-1 px-2.5">Supabase</Badge>
              <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/50 py-1 px-2.5">Tailwind CSS 4</Badge>
              <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/50 py-1 px-2.5">Framer Motion 12</Badge>
              <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/50 py-1 px-2.5">pgvector</Badge>
            </div>
          </motion.div>
        ) : step === 'info' ? (
          <motion.div 
            key="info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-[400px] space-y-10 relative z-10"
          >
            {/* Back Button */}
            <div className="absolute -top-12 left-0 z-20">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                <ArrowLeft size={14} />
                Back to Welcome
              </button>
            </div>

            {/* Header / Logo Section */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center tracking-tighter">
                <span className="text-5xl font-black text-white">FRM</span>
                <span className="text-5xl font-black text-blue-600">AS</span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
                Facial Recognition & Monitoring Access System
              </p>
            </div>

            {/* Form Container */}
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-xl font-bold text-blue-600/90 tracking-tight">
                  {mode === 'signup' 
                    ? (userRole === 'student' ? 'Student Sign-Up' : 'Admin Sign-Up')
                    : (userRole === 'student' ? 'Student Log In' : 'Admin Log In')
                  }
                </h2>
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mt-4" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  {/* Role Selection */}
                  <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <button
                      type="button"
                      onClick={() => setUserRole('student')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                        userRole === 'student' ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <GraduationCap size={14} />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRole('admin')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                        userRole === 'admin' ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Briefcase size={14} />
                      Admin
                    </button>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 ml-1">Full Name:</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        placeholder="Alex Johnson"
                        className="pl-12 h-12 bg-zinc-900/40 border-zinc-800/60 focus-visible:ring-blue-600/50 rounded-xl text-zinc-200 placeholder:text-zinc-700"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Student ID */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 ml-1">Student ID:</label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        placeholder="202145678"
                        className="pl-12 h-12 bg-zinc-900/40 border-zinc-800/60 focus-visible:ring-blue-600/50 rounded-xl text-zinc-200 placeholder:text-zinc-700"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Course / Year (Dropdown for student signup) */}
                  {mode === 'signup' && userRole === 'student' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-bold text-zinc-400 ml-1">Course / Year:</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 z-10" />
                        <select
                          className="flex h-12 w-full rounded-xl border border-zinc-800/60 bg-zinc-900/40 pl-12 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 appearance-none"
                          value={courseYear}
                          onChange={(e) => setCourseYear(e.target.value)}
                          required
                        >
                          <option value="" disabled className="bg-zinc-900 text-zinc-500">Select Course / Year</option>
                          <option value="Computer Science / 1st Year" className="bg-zinc-900">Computer Science / 1st Year</option>
                          <option value="Computer Science / 2nd Year" className="bg-zinc-900">Computer Science / 2nd Year</option>
                          <option value="Computer Science / 3rd Year" className="bg-zinc-900">Computer Science / 3rd Year</option>
                          <option value="Computer Science / 4th Year" className="bg-zinc-900">Computer Science / 4th Year</option>
                          <option value="Information Tech / 1st Year" className="bg-zinc-900">Information Tech / 1st Year</option>
                          <option value="Information Tech / 2nd Year" className="bg-zinc-900">Information Tech / 2nd Year</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white shadow-xl shadow-blue-900/20 transition-all border-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    mode === 'signup' ? 'Confirm Sign Up' : 'Log In'
                  )}
                </Button>
              </form>

              {/* Footer Link */}
              <div className="text-center pt-2">
                <button 
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {mode === 'login' ? (
                    <>New here? <span className="text-blue-500 font-bold ml-1">Sign Up</span></>
                  ) : (
                    <>Have already account? <span className="text-blue-500 font-bold ml-1">Log In</span></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="face"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
             <FaceRegistration onSuccess={() => {
                router.push('/dashboard');
                router.refresh();
             }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative footer text */}
      <div className="absolute bottom-8 text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
        Secured Access Terminal v2.0
      </div>
    </div>
  );
}
