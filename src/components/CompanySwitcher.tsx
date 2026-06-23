// components/CompanySwitcher.tsx
import { useApp } from '@/contexts/AppContext';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function CompanySwitcher() {
  const { 
    companies, 
    currentCompany, 
    setCurrentCompany,
    createCompany 
  } = useApp();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      toast({ title: 'Company name required', variant: 'destructive' });
      return;
    }
    createCompany(newCompanyName.trim());
    setNewCompanyName('');
    setDialogOpen(false);
    toast({ title: 'Company created', description: newCompanyName.trim() });
  };

  if (!companies || companies.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Create Company
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={currentCompany?.id || ''}
          onValueChange={(value) => {
            const company = companies.find(c => c.id === value);
            if (company) setCurrentCompany(company);
          }}
        >
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
            <div className="border-t pt-1 mt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-xs"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Create New Company
              </Button>
            </div>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCompany()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCompany}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}