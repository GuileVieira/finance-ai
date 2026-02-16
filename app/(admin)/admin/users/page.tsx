import { getUsersWithCompanies, getCompanies } from '@/lib/actions/admin.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, Edit, Shield, Building2 } from 'lucide-react';
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

export default async function AdminUsersPage() {
  const usersWithCompanies = await getUsersWithCompanies();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Gerenciar Usuários</h2>
          <p className="text-sm text-slate-400">Gerencie acessos, permissões e vínculos de usuários com empresas.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Usuário</TableHead>
              <TableHead className="text-slate-400">Permissão</TableHead>
              <TableHead className="text-slate-400">Empresa Vinculada</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersWithCompanies.map((item) => (
              <TableRow key={`${item.user.id}-${item.company?.id}`} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                <TableCell className="font-medium text-slate-200">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                       {item.user.name}
                       {item.user.isSuperAdmin && (
                         <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] h-4">Super Admin</Badge>
                       )}
                    </span>
                    <span className="text-xs text-slate-500">{item.user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                    {item.role === 'owner' ? 'Dono' : item.role === 'admin' ? 'Administrador' : 'Visualizador'}
                  </div>
                </TableCell>
                <TableCell>
                  {item.company ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Building2 className="h-4 w-4 text-slate-600" />
                      {item.company.name}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs italic">Nenhum vínculo</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.user.active ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Inativo</Badge>
                  )}
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
