'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [emailOrPtfId, setEmailOrPtfId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let loginEmail = emailOrPtfId.trim();

      // Support 'demo' and 'student' shorthand or scholar ID resolution
      if (loginEmail.toLowerCase() === 'demo') {
        loginEmail = 'demo@ptffoundation.org';
      } else if (loginEmail.toLowerCase() === 'student') {
        loginEmail = 'student.demo@ptffoundation.org';
      } else if (!loginEmail.includes('@')) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('profile_id, profiles:profile_id(email)')
          .ilike('ptf_id', loginEmail)
          .maybeSingle();

        if (studentRecord && (studentRecord as any).profiles?.email) {
          loginEmail = (studentRecord as any).profiles.email;
        } else {
          // If no email found for this PTF ID
          setErrorMessage('Invalid Scholar ID or Email.');
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        setErrorMessage('Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Check profile to determine first-time login
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password, role, is_active')
          .eq('id', data.user.id)
          .single();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          setErrorMessage('This account has been deactivated. Please contact the foundation administrator.');
          setIsLoading(false);
          return;
        }

        if (profile?.must_change_password) {
          router.push('/change-password');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen h-dvh max-h-dvh flex flex-col justify-between bg-[#0A192F] relative overflow-hidden">
      {/* SRM University Campus Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/images/login-bg.jpg"
          alt="SRM University Campus Entrance"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105"
        />
        {/* Institutional Navy & Gold Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F]/92 via-[#0A192F]/78 to-[#0A192F]/95 backdrop-blur-[2px]" />
      </div>

      {/* Top Header Branding */}
      <header className="py-2.5 sm:py-3 px-4 sm:px-8 flex items-center justify-between z-10 border-b border-white/10 backdrop-blur-md bg-[#0A192F]/75 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/95 px-2 py-1 rounded-lg shadow-sm flex items-center">
            <img
              src="/logos/ptf-vizhuthugal.png"
              alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xs sm:text-sm tracking-wider drop-shadow-sm leading-tight">
              PUTHIYA THALAIMURAI FOUNDATION
            </h1>
            <p className="text-[#D4AF37] text-[10px] sm:text-[11px] font-semibold tracking-wide leading-tight">
              VIZHUTHUGAL SCHOLARSHIP SCHEME
            </p>
          </div>
        </div>

        {/* Right Header with SRMIST and SRM AP Logos */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="bg-white/95 px-2 py-1 rounded-lg shadow-sm flex items-center">
              <img
                src="/logos/srmist.png"
                alt="SRM Institute of Science & Technology (SRMIST)"
                className="h-5 sm:h-6 w-auto object-contain"
              />
            </div>
            <div className="bg-white/95 px-2 py-1 rounded-lg shadow-sm flex items-center">
              <img
                src="/logos/srm-university-ap.png"
                alt="SRM University AP"
                className="h-5 sm:h-6 w-auto object-contain"
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-[#0A192F]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-inner text-[10.5px]">
            <span className="font-semibold text-slate-300">Campuses:</span>
            <span className="font-bold text-white">SRM KTR</span>
            <span className="text-[#D4AF37]">•</span>
            <span className="font-bold text-white">SRM BAB</span>
            <span className="text-[#D4AF37]">•</span>
            <span className="font-bold text-white">SRM AP</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-2 sm:py-3 z-10 min-h-0 overflow-hidden">
        <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 overflow-hidden ring-1 ring-black/5 flex flex-col justify-center">
          {/* Card Gold Header Accent */}
          <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#F5E6BE] to-[#D4AF37] shrink-0" />

          <div className="px-6 sm:px-8 py-4 sm:py-5">
            {/* Logos & Title */}
            <div className="flex flex-col items-center mb-3">
              {/* All 3 Official Logos: PTF Vizhuthugal, SRMIST, SRM University AP */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-2.5">
                <div className="bg-white px-2 py-1 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <img
                    src="/logos/ptf-vizhuthugal.png"
                    alt="Puthiya Thalaimurai Foundation - Vizhuthugal"
                    className="h-7 sm:h-8 w-auto object-contain"
                  />
                </div>
                <div className="bg-white px-2 py-1 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <img
                    src="/logos/srmist.png"
                    alt="SRM Institute of Science & Technology (SRMIST)"
                    className="h-6 sm:h-7 w-auto object-contain"
                  />
                </div>
                <div className="bg-white px-2 py-1 rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <img
                    src="/logos/srm-university-ap.png"
                    alt="SRM University AP"
                    className="h-6 sm:h-7 w-auto object-contain"
                  />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-[#0A192F] tracking-tight">
                Institutional Portal Login
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5 italic font-medium text-center">
                &ldquo;Building Students&apos; Personality Through Social Service&rdquo;
              </p>
            </div>

            {errorMessage && (
              <div role="alert" id="login-error" className="mb-3 p-2.5 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label htmlFor="login-id" className="block text-[11px] font-bold text-[#0A192F] uppercase tracking-wider mb-1">
                  Login ID / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-id"
                    type="text"
                    required
                    value={emailOrPtfId}
                    onChange={(e) => setEmailOrPtfId(e.target.value)}
                    placeholder="e.g. PTF001 or email@institution.org"
                    className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0A192F] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#0A192F] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-[11px] font-bold text-[#0A192F] uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-[#D4AF37] hover:text-[#B89726] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0A192F] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#0A192F] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#0A192F]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full shadow-md hover:shadow-lg font-bold py-2.5"
                >
                  Sign In to Portal
                </Button>
              </div>
            </form>

            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] text-center space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailOrPtfId('demo@ptffoundation.org');
                      setPassword('Demo@2026');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0A192F] bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Demo Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailOrPtfId('staff.mentor@ptffoundation.org');
                      setPassword('Staff@2026');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0A192F] bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span>Demo Staff Mentor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailOrPtfId('PTF001');
                      setPassword('Student@2026');
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0A192F] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <span>Demo Student (PTF001)</span>
                  </button>
                </div>

                <p className="text-[10.5px] text-[#64748B] leading-tight">
                  Student and Staff accounts are provisioned by Foundation Administration.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2.5 px-4 sm:px-6 text-center text-[10.5px] text-slate-300 z-10 border-t border-white/10 backdrop-blur-md bg-[#0A192F]/60 shrink-0">
        <p>© {new Date().getFullYear()} Puthiya Thalaimurai Foundation. All rights reserved.</p>
        <p className="mt-0.5 text-slate-400">Vizhuthugal Institutional Student Portal | Secure SSL Architecture</p>
      </footer>
    </div>
  );
}
