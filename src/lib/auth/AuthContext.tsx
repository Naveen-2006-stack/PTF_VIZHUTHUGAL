'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../supabase/client';
import { Profile, Student, StaffProfile, UserRole } from '@/types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  student: Student | null;
  staff: StaffProfile | null;
  role: UserRole | null;
  campusCode: string;
  isSpecialClassEligible: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  student: null,
  staff: null,
  role: null,
  campusCode: 'SRM_KTR',
  isSpecialClassEligible: false,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [isSpecialClassEligible, setIsSpecialClassEligible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          if (!profileData.is_active) {
            await supabase.auth.signOut();
            setProfile(null);
            setUser(null);
            router.replace('/login');
            return;
          }

          setProfile(profileData as Profile);

          // Force Password Change Check
          if (profileData.must_change_password && pathname !== '/change-password') {
            router.push('/change-password');
          }

          // Fetch Role-specific profile
          if (profileData.role === 'STUDENT') {
            const { data: studentData } = await supabase
              .from('students')
              .select('*, campus:campuses(*), department:departments(*), course:courses(*)')
              .eq('profile_id', user.id)
              .maybeSingle();

            if (studentData) {
              const { data: elig } = await supabase
                .from('special_class_eligibility')
                .select('is_eligible')
                .eq('student_id', studentData.id)
                .maybeSingle();

              const eligible = Boolean(elig?.is_eligible);
              setIsSpecialClassEligible(eligible);
              (studentData as any).is_special_class_eligible = eligible;
            } else {
              setIsSpecialClassEligible(false);
            }
            setStudent(studentData as Student | null);
          } else if (profileData.role === 'STAFF_MENTOR') {
            const { data: staffData } = await supabase
              .from('staff_profiles')
              .select('*, campus:campuses(*), department:departments(*)')
              .eq('profile_id', user.id)
              .maybeSingle();

            setStaff(staffData as StaffProfile | null);
            setIsSpecialClassEligible(false);
          } else {
            setIsSpecialClassEligible(false);
          }
        }
      } else {
        setProfile(null);
        setStudent(null);
        setStaff(null);
        setIsSpecialClassEligible(false);
      }
    } catch (error) {
      console.error('Error loading auth profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setStudent(null);
        setStaff(null);
        setIsSpecialClassEligible(false);
        setIsLoading(false);
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const campusCode = student?.campus?.code || staff?.campus?.code || 'SRM_KTR';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        student,
        staff,
        role: profile?.role || null,
        campusCode,
        isSpecialClassEligible,
        isLoading,
        signOut,
        refreshProfile: fetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
