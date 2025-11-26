import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface FileStorageResult {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: {
    originalName: string;
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
}

export type StorageProvider = 'filesystem' | 'supabase';

export class FileStorageService {
  private static instance: FileStorageService;
  private readonly storageBasePath: string;
  private supabaseClient: SupabaseClient | null = null;
  private supabaseAdminClient: SupabaseClient | null = null;
  private provider: StorageProvider;
  private readonly bucketName = 'ofx-files';

  private constructor() {
    this.storageBasePath = join(process.cwd(), 'storage_tmp');

    // Determinar provider baseado nas variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && supabaseKey !== 'your_supabase_anon_key_here') {
      this.provider = 'supabase';
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);

      // Cliente admin para criar buckets (requer service_role key)
      if (serviceRoleKey) {
        this.supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
        console.log('🚀 Storage provider: Supabase (com admin)');
      } else {
        console.log('🚀 Storage provider: Supabase (sem admin - bucket deve existir)');
      }
    } else {
      this.provider = 'filesystem';
      console.log('📁 Storage provider: Filesystem');
    }
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  public getProvider(): StorageProvider {
    return this.provider;
  }

  /**
   * Salva um arquivo OFX no sistema de arquivos ou Supabase
   */
  async saveOFXFile(
    buffer: ArrayBuffer,
    originalName: string,
    companyId: string
  ): Promise<FileStorageResult> {
    try {
      // Validar se é um arquivo OFX
      if (!this.isValidOFXFile(originalName, buffer)) {
        return {
          success: false,
          error: 'Formato de arquivo inválido. Apenas arquivos .ofx são permitidos.'
        };
      }

      if (this.provider === 'supabase') {
        return await this.saveToSupabase(buffer, originalName, companyId);
      } else {
        return await this.saveToFilesystem(buffer, originalName, companyId);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar arquivo:', error);
      return {
        success: false,
        error: `Erro ao salvar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Salva arquivo no Supabase Storage
   */
  private async saveToSupabase(
    buffer: ArrayBuffer,
    originalName: string,
    companyId: string
  ): Promise<FileStorageResult> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client não inicializado');
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(originalName);
    const filename = `${timestamp}_${uuidv4()}.${extension}`;

    // Caminho no bucket: ofx/[empresa-id]/[ano-mes]/arquivo.ofx
    const storagePath = `ofx/${companyId}/${yearMonth}/${filename}`;

    // Garantir que o bucket existe
    await this.ensureBucketExists();

    // Upload para o Supabase
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, {
        contentType: this.getMimeType(originalName),
        upsert: false
      });

    if (error) {
      throw new Error(`Erro no upload Supabase: ${error.message}`);
    }

    const metadata = {
      originalName,
      filename,
      size: buffer.byteLength,
      mimeType: this.getMimeType(originalName),
      uploadedAt: now.toISOString(),
      companyId,
      relativePath: storagePath
    };

    console.log(`☁️ Arquivo salvo no Supabase: ${storagePath}`);

    return {
      success: true,
      filePath: storagePath,
      metadata
    };
  }

  /**
   * Salva arquivo no filesystem local
   */
  private async saveToFilesystem(
    buffer: ArrayBuffer,
    originalName: string,
    companyId: string
  ): Promise<FileStorageResult> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const relativePath = join('ofx', companyId, yearMonth);
    const fullPath = join(this.storageBasePath, relativePath);

    // Criar diretórios se não existirem
    await this.ensureDirectoryExists(fullPath);

    // Gerar nome de arquivo único com timestamp
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(originalName);
    const filename = `${timestamp}_${uuidv4()}.${extension}`;
    const filePath = join(fullPath, filename);

    // Salvar arquivo
    await writeFile(filePath, new Uint8Array(buffer));

    // Salvar metadados
    const metadataPath = join(fullPath, `${filename}.json`);
    const metadata = {
      originalName,
      filename,
      size: buffer.byteLength,
      mimeType: this.getMimeType(originalName),
      uploadedAt: now.toISOString(),
      companyId,
      relativePath: join(relativePath, filename)
    };

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`📁 Arquivo salvo: ${filePath}`);

    return {
      success: true,
      filePath: metadata.relativePath,
      metadata
    };
  }

  /**
   * Garante que o bucket do Supabase existe
   * Usa o admin client (service_role) se disponível, pois anon key não pode criar buckets
   */
  private async ensureBucketExists(): Promise<void> {
    // Preferir admin client para criar bucket (tem permissão)
    const client = this.supabaseAdminClient || this.supabaseClient;
    if (!client) return;

    try {
      const { data: buckets, error: listError } = await client.storage.listBuckets();

      if (listError) {
        console.warn('⚠️ Erro ao listar buckets:', listError.message);
        return;
      }

      const bucketExists = buckets?.some(b => b.name === this.bucketName);

      if (!bucketExists) {
        if (!this.supabaseAdminClient) {
          console.warn('⚠️ Bucket não existe e service_role key não configurada. Crie o bucket manualmente no Supabase.');
          return;
        }

        const { error: createError } = await this.supabaseAdminClient.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });

        if (createError) {
          console.error('❌ Erro ao criar bucket:', createError.message);
        } else {
          console.log(`✅ Bucket '${this.bucketName}' criado no Supabase (público)`);
        }
      }
    } catch (error) {
      console.error('⚠️ Erro ao verificar/criar bucket:', error);
    }
  }

  /**
   * Lê um arquivo do sistema de arquivos
   */
  async readFile(relativePath: string): Promise<Buffer | null> {
    try {
      const fullPath = join(this.storageBasePath, relativePath);
      const fs = await import('fs/promises');
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('❌ Erro ao ler arquivo:', error);
      return null;
    }
  }

  /**
   * Lê metadados de um arquivo
   */
  async readMetadata(relativePath: string): Promise<any | null> {
    try {
      const metadataPath = join(this.storageBasePath, `${relativePath}.json`);
      const fs = await import('fs/promises');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Erro ao ler metadados:', error);
      return null;
    }
  }

  /**
   * Lista todos os arquivos OFX de uma empresa
   */
  async listCompanyFiles(companyId: string): Promise<any[]> {
    try {
      const companyPath = join(this.storageBasePath, 'ofx', companyId);
      const fs = await import('fs/promises');

      // Verificar se o diretório existe
      try {
        await access(companyPath);
      } catch {
        return [];
      }

      const files = [];
      const years = await fs.readdir(companyPath);

      for (const year of years) {
        const yearPath = join(companyPath, year);
        const stats = await fs.stat(yearPath);

        if (stats.isDirectory()) {
          const yearFiles = await fs.readdir(yearPath);

          for (const file of yearFiles) {
            if (file.endsWith('.json')) {
              const metadataPath = join(yearPath, file);
              const content = await fs.readFile(metadataPath, 'utf-8');
              files.push(JSON.parse(content));
            }
          }
        }
      }

      return files.sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      return [];
    }
  }

  /**
   * Remove um arquivo e seus metadados
   */
  async deleteFile(relativePath: string): Promise<FileStorageResult> {
    try {
      const fs = await import('fs/promises');
      const fullPath = join(this.storageBasePath, relativePath);
      const metadataPath = join(this.storageBasePath, `${relativePath}.json`);

      // Remover arquivo
      await fs.unlink(fullPath);
      // Remover metadados
      await fs.unlink(metadataPath);

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Erro ao remover arquivo:', error);
      return {
        success: false,
        error: `Erro ao remover arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Verifica se o arquivo é um OFX válido
   */
  private isValidOFXFile(filename: string, buffer: ArrayBuffer): boolean {
    const extension = this.getFileExtension(filename);
    if (extension !== 'ofx') {
      return false;
    }

    // Verificar conteúdo básico do arquivo OFX
    const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const normalizedContent = content.toUpperCase().trim();

    return normalizedContent.includes('OFXHEADER') &&
           normalizedContent.includes('SIGNONMSGSRSV1') &&
           (normalizedContent.includes('BANKMSGSRSV1') ||
            normalizedContent.includes('CREDITCARDMSGSRSV1'));
  }

  /**
   * Obtém a extensão do arquivo
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Obtém o MIME type baseado na extensão
   */
  private getMimeType(filename: string): string {
    const extension = this.getFileExtension(filename);
    const mimeTypes: Record<string, string> = {
      'ofx': 'application/x-ofx',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Garante que um diretório existe
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Obtém estatísticas de armazenamento por empresa
   */
  async getStorageStats(companyId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
  }> {
    try {
      const files = await this.listCompanyFiles(companyId);

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      const sortedFiles = files.sort((a, b) =>
        new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      );

      return {
        totalFiles,
        totalSize,
        oldestFile: sortedFiles[0]?.uploadedAt,
        newestFile: sortedFiles[sortedFiles.length - 1]?.uploadedAt
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}

export default FileStorageService.getInstance();