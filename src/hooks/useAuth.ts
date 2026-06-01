import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'user' | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setRole(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch role when user changes (deferred to avoid blocking auth callback)
  useEffect(() => {
    if (!user) return;
    setTimeout(async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const roles = (data ?? []).map((r: { role: string }) => r.role);
      setRole(roles.includes('admin') ? 'admin' : roles.includes('user') ? 'user' : null);
    }, 0);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, role, loading, signOut };
}
