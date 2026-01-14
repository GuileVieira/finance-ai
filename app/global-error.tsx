'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="pt-BR">
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center text-foreground">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Erro Crítico</h1>
                        <p className="max-w-[500px] text-muted-foreground">
                            Ocorreu um erro no carregamento da aplicação.
                        </p>
                    </div>
                    <Button onClick={reset} variant="default">
                        Tentar novamente
                    </Button>
                </div>
            </body>
        </html>
    );
}
