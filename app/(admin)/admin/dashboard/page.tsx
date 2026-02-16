import { db } from '@/lib/db/connection';
import { companies, users, accounts } from '@/lib/db/schema';
import { count } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wallet, Rocket } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const [companiesCount] = await db.select({ value: count() }).from(companies);
  const [usersCount] = await db.select({ value: count() }).from(users);
  const [accountsCount] = await db.select({ value: count() }).from(accounts);

  const stats = [
    {
      title: 'Total de Empresas',
      value: companiesCount.value,
      icon: Building2,
      href: '/admin/companies',
      color: 'text-blue-400',
    },
    {
      title: 'Usuários Ativos',
      value: usersCount.value,
      icon: Users,
      href: '/admin/users',
      color: 'text-emerald-400',
    },
    {
      title: 'Contas Bancárias',
      value: accountsCount.value,
      icon: Wallet,
      href: '/admin/accounts',
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color} group-hover:scale-110 transition-transform`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            Ações Rápidas de Setup
          </h3>
          <div className="grid gap-4">
            <Link 
              href="/admin/companies" 
              className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50"
            >
              <div>
                <p className="font-medium text-white">Nova Empresa</p>
                <p className="text-sm text-slate-400">Criar empresa e setup inicial</p>
              </div>
              <Building2 className="h-5 w-5 text-slate-500" />
            </Link>
            <Link 
              href="/admin/users" 
              className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50"
            >
              <div>
                <p className="font-medium text-white">Novo Usuário</p>
                <p className="text-sm text-slate-400">Adicionar acesso a empresa</p>
              </div>
              <Users className="h-5 w-5 text-slate-500" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
