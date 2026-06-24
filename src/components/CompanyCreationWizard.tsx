import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCompanyManagement } from '@/hooks/useCompanyManagement';

interface CompanyCreationWizardProps {
  userId: string;
  onCompanyCreated?: (companyId: string) => void;
}

export function CompanyCreationWizard({ userId, onCompanyCreated }: CompanyCreationWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createCompany, loading, error: createError } = useCompanyManagement();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currency: 'OMR',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Company name is required', variant: 'destructive' });
      return;
    }

    const companyId = await createCompany(formData, userId);
    
    if (companyId) {
      toast({ title: 'Success', description: 'Company created successfully!' });
      onCompanyCreated?.(companyId);
      // Refresh the page to load the new company
      window.location.reload();
    } else {
      toast({
        title: 'Error',
        description: createError || 'Failed to create company',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to BookIt</CardTitle>
          <CardDescription>Set up your first company to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="company-email">Email (optional)</Label>
              <Input
                id="company-email"
                type="email"
                placeholder="company@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="company-phone">Phone (optional)</Label>
              <Input
                id="company-phone"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="company-address">Address (optional)</Label>
              <Input
                id="company-address"
                placeholder="123 Business Ave, City, Country"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="company-currency">Default Currency</Label>
              <select
                id="company-currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border rounded-md border-input bg-background"
              >
                <option value="OMR">OMR (Oman)</option>
                <option value="USD">USD (United States)</option>
                <option value="EUR">EUR (Europe)</option>
                <option value="GBP">GBP (United Kingdom)</option>
                <option value="INR">INR (India)</option>
                <option value="AED">AED (UAE)</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Company'}
            </Button>

            <div className="text-xs text-muted-foreground text-center pt-2">
              You can add more companies later from settings.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
