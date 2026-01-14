'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log do erro para serviço de observabilidade se necessário
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">Algo deu errado!</h2>
                <p className="max-w-[500px] text-muted-foreground">
                    Encontramos um erro inesperado ao processar sua solicitação.
                    Por favor, tente novamente ou contate o suporte se o problema persistir.
                </p>
            </div>
            <Button onClick={reset} variant="default">
                Tentar novamente
            </Button>
        </div>
    );
}
