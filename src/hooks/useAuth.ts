import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Company } from '@/types';

type Role = 'admin' | 'user' | null;

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
}

export interface CompanyAssignment {
  company_id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'staff';
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<CompanyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Check session and listen for auth changes
  useEffect(() => {
    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRole(null);
        setProfile(null);
        setCompanies([]);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch role and profile when user changes
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const roles = (roleData ?? []).map((r: { role: string }) => r.role);
        setRole(roles.includes('admin') ? 'admin' : roles.includes('user') ? 'user' : null);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        setProfile({
          id: user.id,
          displayName: profileData?.display_name || user.email || 'User',
          email: user.email || '',
        });

        // Fetch assigned companies
        const { data: companyData } = await supabase
          .from('company_users')
          .select('company_id, companies(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (companyData) {
          const companies = companyData.map((cu: any) => ({
            company_id: cu.company_id,
            company_name: cu.companies?.name || 'Unknown Company',
            role: cu.role || 'staff',
          }));
          setCompanies(companies);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { 
    user, 
    session, 
    role, 
    profile,
    companies,
    loading, 
    signOut,
    isAuthenticated: !!user,
  };
}
