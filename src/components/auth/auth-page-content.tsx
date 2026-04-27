'use client';

import { useState, useEffect } from 'react';
import { signInWithID, signUpWithID } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  User, 
  Hash, 
  GraduationCap, 
  Briefcase,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AuthPageContent() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup'); // Default to signup as in image
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [courseYear, setCourseYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'student'>('student');
  const router = useRouter();

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
        await signInWithID(name, id);
        toast.success('Login successful!');
        router.push('/dashboard');
        router.refresh();
      } else {
        await signUpWithID(name, id, userRole, courseYear);
        toast.success('Account created!', { description: 'Taking you to registration...' });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] space-y-10 relative z-10"
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
        </div>

        {/* Form Container */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-xl font-bold text-blue-600/90 tracking-tight">
              {mode === 'signup' 
                ? (userRole === 'student' ? 'Step 1: Student Sign-Up' : 'Step 1: Admin Sign-Up')
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

      {/* Decorative footer text */}
      <div className="absolute bottom-8 text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
        Secured Access Terminal v2.0
      </div>
    </div>
  );
}
