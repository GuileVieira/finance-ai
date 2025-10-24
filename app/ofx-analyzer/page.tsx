import OFXUploadAnalyzer from '@/components/ofx-upload-analyzer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analisador de OFX | Financeiro Aldo',
  description: 'Upload e análise inteligente de arquivos OFX com classificação automática de transações',
};

export default function OFXAnalyzerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <OFXUploadAnalyzer />
      </div>
    </div>
  );
}