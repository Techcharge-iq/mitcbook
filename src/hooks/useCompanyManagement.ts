import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyAssignment } from './useAuth';

export interface CompanyCreationData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
}

export function useCompanyManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCompany = async (data: CompanyCreationData, userId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          id: crypto.randomUUID(),
          name: data.name,
          user_id: userId,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Add user as owner
      const { error: assignError } = await supabase
        .from('company_users')
        .insert({
          company_id: company.id,
          user_id: userId,
          role: 'owner',
        });

      if (assignError) throw assignError;

      // Create business settings for the company
      const { error: settingsError } = await supabase
        .from('business_settings')
        .insert({
          id: crypto.randomUUID(),
          company_id: company.id,
          user_id: userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          currency: data.currency || 'OMR',
          vat_enabled: true,
          default_vat_percentage: 5,
        });

      if (settingsError) throw settingsError;

      return company.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create company';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyName = async (companyId: string, name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', companyId);

      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update company';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCompany = async (companyId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete company';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCompany,
    updateCompanyName,
    deleteCompany,
    loading,
    error,
  };
}
