import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente manualmente
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
    });
}

async function testStorageConnection() {
  console.log('🧪 Iniciando Teste de Conexão com MinIO/S3...');
  console.log('-------------------------------------------');

  try {
    const { default: storage } = await import('../lib/storage/file-storage.service');
    
    const provider = storage.getProvider();
    console.log(`📡 Provedor Ativo: ${provider}`);

    if (provider !== 's3') {
      console.error('❌ Erro: O provedor s3 não está ativo no .env');
      process.exit(1);
    }

    console.log(`📍 Endpoint: ${process.env.S3_ENDPOINT}`);
    console.log(`📦 Bucket: ${process.env.S3_BUCKET_NAME}`);
    console.log(`🌍 Região: ${process.env.S3_REGION}`);

    console.log('\n🔍 Tentando listar arquivos (isso testa a conectividade)...');
    
    // O listCompanyFiles já faz a verificação/criação do bucket internamente
    const files = await storage.listCompanyFiles('test-connection');
    
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`📊 Arquivos encontrados no prefixo de teste: ${files.length}`);
    
    console.log('\n📝 Resumo: O sistema conseguiu se comunicar com o MinIO e verificar o bucket.');

  } catch (error: any) {
    console.error('\n❌ Falha na conexão com o MinIO:');
    if (error.name === 'CredentialsProviderError') {
      console.error('   -> Erro de Credenciais: Verifique Access Key e Secret Key.');
    } else if (error.name === 'EndpointConnectionError' || error.code === 'ENOTFOUND') {
      console.error('   -> Erro de Endpoint: Não foi possível alcançar a URL do MinIO.');
    } else {
      console.error(`   -> Detalhes: ${error.message}`);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testStorageConnection();
