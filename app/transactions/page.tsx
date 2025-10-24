import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as suas transações financeiras
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta página está em desenvolvimento. Em breve você poderá:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Visualizar todas as transações</li>
            <li>Filtrar por período, categoria e conta</li>
            <li>Editar e categorizar transações</li>
            <li>Exportar relatórios</li>
            <li>Importar novos lançamentos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}