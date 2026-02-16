import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

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

export type StorageProvider = 'filesystem' | 'supabase' | 's3';

export class FileStorageService {
  private static instance: FileStorageService;
  private readonly storageBasePath: string;
  private supabaseClient: SupabaseClient | null = null;
  private supabaseAdminClient: SupabaseClient | null = null;
  private s3Client: S3Client | null = null;
  private provider: StorageProvider;
  private readonly bucketName: string;

  private constructor() {
    this.storageBasePath = join(process.cwd(), 'storage_tmp');
    this.bucketName = process.env.S3_BUCKET_NAME || 'ofx-files';

    // Determinar provider baseado nas variáveis de ambiente
    const storageEnv = process.env.STORAGE_PROVIDER as StorageProvider;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
    const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (storageEnv === 's3' || (s3Endpoint && s3AccessKey && s3SecretKey)) {
      this.provider = 's3';
      this.s3Client = new S3Client({
        endpoint: s3Endpoint,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: s3AccessKey!,
          secretAccessKey: s3SecretKey!,
        },
        forcePathStyle: true, // Necessário para MinIO
      });
      console.log('🚀 Storage provider: S3/MinIO');
    } else if (supabaseUrl && supabaseKey && supabaseKey !== 'your_supabase_anon_key_here') {
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
   * Salva um arquivo OFX no sistema de arquivos, Supabase ou S3
   */
  async saveOFXFile(
    buffer: ArrayBuffer | Buffer,
    originalName: string,
    companyId: string
  ): Promise<FileStorageResult> {
    try {
      // Validar se é um arquivo OFX
      if (!this.isValidOFXFile(originalName, buffer as ArrayBuffer)) {
        return {
          success: false,
          error: 'Formato de arquivo inválido. Apenas arquivos .ofx são permitidos.'
        };
      }

      if (this.provider === 's3') {
        return await this.saveToS3(buffer, originalName, companyId);
      } else if (this.provider === 'supabase') {
        return await this.saveToSupabase(buffer as ArrayBuffer, originalName, companyId);
      } else {
        return await this.saveToFilesystem(buffer as ArrayBuffer, originalName, companyId);
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
   * Salva arquivo no S3/MinIO
   */
  private async saveToS3(
    buffer: ArrayBuffer | Buffer,
    originalName: string,
    companyId: string
  ): Promise<FileStorageResult> {
    if (!this.s3Client) {
      throw new Error('S3 client não inicializado');
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(originalName);
    const filename = `${timestamp}_${uuidv4()}.${extension}`;

    // Caminho no bucket: ofx/[empresa-id]/[ano-mes]/arquivo.ofx
    const storagePath = `ofx/${companyId}/${yearMonth}/${filename}`;

    // Garantir que o bucket existe
    await this.ensureS3BucketExists();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storagePath,
      Body: buffer instanceof Buffer ? buffer : Buffer.from(buffer),
      ContentType: this.getMimeType(originalName),
    });

    await this.s3Client.send(command);

    const metadata = {
      originalName,
      filename,
      size: buffer.byteLength,
      mimeType: this.getMimeType(originalName),
      uploadedAt: now.toISOString(),
      companyId,
      relativePath: storagePath
    };

    console.log(`☁️ Arquivo salvo no S3/MinIO: ${storagePath}`);

    return {
      success: true,
      filePath: storagePath,
      metadata
    };
  }

  /**
   * Garante que o bucket do S3 existe
   */
  private async ensureS3BucketExists(): Promise<void> {
    if (!this.s3Client) return;

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`🆕 Criando bucket S3: ${this.bucketName}`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
      } else {
        console.warn('⚠️ Erro ao verificar bucket S3:', error.message);
      }
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

    // Garantir que o bucket existe (usando nome fixo para Supabase como antes)
    const supabaseBucket = 'ofx-files';
    await this.ensureSupabaseBucketExists(supabaseBucket);

    // Upload para o Supabase
    const { data, error } = await this.supabaseClient.storage
      .from(supabaseBucket)
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

    console.log(`📁 Arquivo salvo no filesystem: ${filePath}`);

    return {
      success: true,
      filePath: metadata.relativePath,
      metadata
    };
  }

  /**
   * Garante que o bucket do Supabase existe
   */
  private async ensureSupabaseBucketExists(bucketName: string): Promise<void> {
    const client = this.supabaseAdminClient || this.supabaseClient;
    if (!client) return;

    try {
      const { data: buckets, error: listError } = await client.storage.listBuckets();
      if (listError) return;

      const bucketExists = buckets?.some(b => b.name === bucketName);

      if (!bucketExists && this.supabaseAdminClient) {
        await this.supabaseAdminClient.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
        console.log(`✅ Bucket '${bucketName}' criado no Supabase`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao verificar bucket Supabase:', error);
    }
  }

  /**
   * Lê um arquivo do storage (filesystem ou S3)
   */
  async readFile(relativePath: string): Promise<Buffer | null> {
    try {
      if (this.provider === 's3' && this.s3Client) {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: relativePath,
        });
        const response = await this.s3Client.send(command);
        const body = await response.Body?.transformToByteArray();
        return body ? Buffer.from(body) : null;
      } else {
        const fullPath = join(this.storageBasePath, relativePath);
        const fs = await import('fs/promises');
        return await fs.readFile(fullPath);
      }
    } catch (error) {
      console.error('❌ Erro ao ler arquivo:', error);
      return null;
    }
  }

  /**
   * Lê metadados de um arquivo (filesystem ou S3 simulado via metadata)
   */
  async readMetadata(relativePath: string): Promise<any | null> {
    try {
      if (this.provider === 's3') {
        // No S3 simples não salvamos .json separado, mas poderíamos.
        // Por enquanto retornamos null ou implementamos lógica similar se necessário.
        return null; 
      }
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
   * Lista arquivos de uma empresa (filesystem ou S3)
   */
  async listCompanyFiles(companyId: string): Promise<any[]> {
    try {
      if (this.provider === 's3' && this.s3Client) {
        const prefix = `ofx/${companyId}/`;
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
        });
        const response = await this.s3Client.send(command);
        return (response.Contents || []).map(obj => ({
          filename: obj.Key?.split('/').pop(),
          size: obj.Size,
          uploadedAt: obj.LastModified?.toISOString(),
          relativePath: obj.Key
        }));
      } else {
        const companyPath = join(this.storageBasePath, 'ofx', companyId);
        const fs = await import('fs/promises');
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
        return files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      }
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      return [];
    }
  }

  /**
   * Remove um arquivo (filesystem ou S3)
   */
  async deleteFile(relativePath: string): Promise<FileStorageResult> {
    try {
      if (this.provider === 's3' && this.s3Client) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: relativePath,
        });
        await this.s3Client.send(command);
      } else {
        const fs = await import('fs/promises');
        const fullPath = join(this.storageBasePath, relativePath);
        const metadataPath = join(this.storageBasePath, `${relativePath}.json`);
        await fs.unlink(fullPath);
        try { await fs.unlink(metadataPath); } catch {}
      }
      return { success: true };
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
    if (extension !== 'ofx') return false;
    const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const normalizedContent = content.toUpperCase().trim();
    return normalizedContent.includes('OFXHEADER') &&
           normalizedContent.includes('SIGNONMSGSRSV1') &&
           (normalizedContent.includes('BANKMSGSRSV1') || normalizedContent.includes('CREDITCARDMSGSRSV1'));
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private getMimeType(filename: string): string {
    const extension = this.getFileExtension(filename);
    const mimeTypes: Record<string, string> = {
      'ofx': 'application/x-ofx',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }
  }

  async getStorageStats(companyId: string): Promise<{
    totalFiles: number;
    totalSize: number;
  }> {
    const files = await this.listCompanyFiles(companyId);
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    return { totalFiles, totalSize };
  }
}

export default FileStorageService.getInstance();