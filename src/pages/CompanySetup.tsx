import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CompanyCreationWizard } from '@/components/CompanyCreationWizard';

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, companies, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // If user not authenticated, go to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // If user has companies, go to dashboard
    if (companies.length > 0) {
      navigate('/', { replace: true });
      return;
    }
  }, [user, companies, loading, navigate]);

  // Show loading screen while checking
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking your companies...</p>
        </div>
      </div>
    );
  }

  // Show company creation wizard if no companies
  if (user && companies.length === 0) {
    return <CompanyCreationWizard userId={user.id} />;
  }

  // Otherwise show nothing (redirect will happen)
  return null;
}
