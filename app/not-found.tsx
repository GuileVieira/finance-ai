import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
                <FileQuestion className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">Página não encontrada</h2>
                <p className="max-w-[500px] text-muted-foreground">
                    A página que você está procurando não existe ou foi removida.
                    Verifique o endereço digitado ou volte para o início.
                </p>
            </div>
            <Button asChild variant="default">
                <Link href="/dashboard">
                    Voltar para o Dashboard
                </Link>
            </Button>
        </div>
    );
}
