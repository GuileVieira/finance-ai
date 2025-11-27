'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  showUploadButton?: boolean;
}

export function EmptyState({
  title = 'Nenhum dado encontrado',
  description = 'Importe seus extratos bancários para começar a visualizar seus dados financeiros.',
  showUploadButton = true,
}: EmptyStateProps) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <FileUp className="h-12 w-12 text-muted-foreground" />
        </div>

        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          {description}
        </p>

        {showUploadButton && (
          <Link href="/upload">
            <Button size="lg" className="gap-2">
              <Upload className="h-5 w-5" />
              Importar Extratos OFX
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
