import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currencySymbols, type Project } from '@/types';
import { Plus, Search, FileText, ArrowRight } from 'lucide-react';

export default function ProjectsList() {
  const { projects, invoices, getClient, settings } = useApp();
  const [search, setSearch] = useState('');

  const currencySymbol = currencySymbols[settings.currency];

  const filteredProjects = projects.filter((project) => {
    const customer = getClient(project.customerId);
    return (
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.lpoNumber.toLowerCase().includes(search.toLowerCase()) ||
      customer?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getProjectTotals = (project: Project) => {
    const projectInvoices = invoices.filter((invoice) => invoice.invoiceType === 'project' && invoice.projectId === project.id);
    const invoicedAmount = projectInvoices.reduce((sum, invoice) => sum + invoice.netTotal, 0);
    const invoicedPercentage = projectInvoices.reduce((sum, invoice) => sum + (invoice.projectSummary?.currentPercentage || 0), 0);
    return {
      invoicedAmount,
      invoicedPercentage: Math.min(100, invoicedPercentage),
      remainingAmount: Math.max(0, project.totalValue - invoicedAmount),
      remainingPercentage: Math.max(0, 100 - Math.min(100, invoicedPercentage)),
    };
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Track projects, progress, and invoice summary.</p>
        </div>
        <Button asChild size="sm" className="h-9">
          <Link to="/projects/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Project
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10 h-9"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">No projects found</p>
            <p className="text-xs text-muted-foreground mb-4">Create a project to begin tracking work and invoicing.</p>
            <Button asChild size="sm">
              <Link to="/projects/new">
                <Plus className="mr-1.5 h-4 w-4" /> Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProjects
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((project) => {
              const customer = getClient(project.customerId);
              const totals = getProjectTotals(project);
              return (
                <Card key={project.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{project.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Customer: {customer?.name || 'Unknown'} • LPO: {project.lpoNumber || '—'} • {project.status}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-9">
                        <Link to={`/projects/${project.id}`}>
                          <ArrowRight className="mr-1.5 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase text-muted-foreground">Value</p>
                        <p className="text-sm font-semibold">{currencySymbol}{project.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase text-muted-foreground">Invoiced</p>
                        <p className="text-sm font-semibold">{currencySymbol}{totals.invoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{totals.invoicedPercentage.toFixed(2)}%</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase text-muted-foreground">Remaining</p>
                        <p className="text-sm font-semibold">{currencySymbol}{totals.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{totals.remainingPercentage.toFixed(2)}%</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase text-muted-foreground">Last Updated</p>
                        <p className="text-sm font-semibold">{new Date(project.updatedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
