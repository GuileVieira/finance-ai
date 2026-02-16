import { getCompanies } from '@/lib/actions/admin.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function AdminCompaniesPage() {
  const allCompanies = await getCompanies();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Gerenciar Empresas</h2>
          <p className="text-sm text-slate-400">Visualize e configure todas as empresas do ecossistema.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Nome da Empresa</TableHead>
              <TableHead className="text-slate-400">CNPJ</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Criada em</TableHead>
              <TableHead className="text-right text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCompanies.map((company) => (
              <TableRow key={company.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                <TableCell className="font-medium text-slate-200 flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-400" />
                  </div>
                  {company.name}
                </TableCell>
                <TableCell className="text-slate-400">{company.cnpj || '-'}</TableCell>
                <TableCell>
                  {company.active ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-slate-400 text-xs">
                  {company.createdAt?.toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="hover:bg-slate-800 text-slate-400 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
