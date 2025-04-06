// pages/api/applications/index.js
import { IncomingForm } from 'formidable';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../lib/prisma'; // Importa a instância única do Prisma Client

// Desabilitar o bodyParser padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configurar Cliente S3 para R2 (lendo do .env.local)
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  // Processar Formulário com Formidable
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) { console.error("[API Route] Erro ao processar formulário:", err); return reject(err); }
      const normalizedFields = {};
      for (const key in fields) { normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key]; }
      resolve({ fields: normalizedFields, files });
    });
  });

  const { fields, files } = data;

  console.log('[API Route] Recebida submissão de aplicação:');
  console.log('Campos do Formulário:', fields);
  console.log('Arquivos Recebidos:', Object.keys(files).map(key => files[key]?.[0]?.originalFilename || 'N/A'));

  // Validação (simplificada)
  const requiredFields = ['fullName', 'address', 'phone', 'email', 'profession', 'maritalStatus', 'bank', 'agency', 'accountNumber', 'accountType', 'offerId'];
  const missingField = requiredFields.find(field => !fields[field]);
  if (missingField) { return res.status(400).json({ message: `Campo obrigatório não preenchido: ${missingField}` }); }
  const requiredFiles = ['residenceProof', 'idDocument', 'taxClearance', 'laborDebtsClearance', 'tstCertificate'];
  const missingFile = requiredFiles.find(fileKey => !files[fileKey]);
  if (missingFile) { return res.status(400).json({ message: `Documento obrigatório não enviado: ${missingFile}` }); }
  if (!R2_BUCKET_NAME) { console.error("[API Route] Erro: R2_BUCKET_NAME não configurado."); return res.status(500).json({ message: 'Erro de configuração do servidor [Bucket].' }); }

  // --- Processamento Principal ---
  const uploadedFilesData = []; // Armazena dados dos arquivos para salvar no DB
  let uploadError = null;
  const tempFilePaths = []; // Guarda caminhos temporários para limpeza

  try {
    // --- 1. Upload dos Arquivos para o R2 ---
    console.log(`[API Route] Iniciando upload para o bucket: ${R2_BUCKET_NAME}`);
    for (const fieldName of requiredFiles) {
      const fileArray = Array.isArray(files[fieldName]) ? files[fieldName] : [files[fieldName]];
      const file = fileArray[0];

      if (file && file.size > 0) {
        tempFilePaths.push(file.filepath); // Adiciona para limpeza posterior
        const uniqueKey = `documentos/${fields.offerId}/${uuidv4()}-${file.originalFilename}`;
        console.log(`[API Route] Fazendo upload de ${file.originalFilename} para R2 como ${uniqueKey}`);

        const uploadCommand = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME, Key: uniqueKey,
          Body: fs.createReadStream(file.filepath), ContentType: file.mimetype,
        });

        await s3Client.send(uploadCommand);
        // Guarda os dados do arquivo para salvar no DB depois
        uploadedFilesData.push({
          fieldName: fieldName,
          r2Key: uniqueKey,
          originalFilename: file.originalFilename,
          mimetype: file.mimetype,
          size: file.size,
          // applicationId será preenchido após criar a application
        });
        console.log(`[API Route] Upload bem-sucedido: ${uniqueKey}`);
      } else {
        throw new Error(`Arquivo inválido ou ausente para o campo: ${fieldName}`);
      }
    }

    // --- 2. Salvar Informações no Banco de Dados (Usando Prisma Transaction) ---
    // Usamos uma transação para garantir que a aplicação e todos os seus
    // arquivos sejam salvos juntos, ou nada seja salvo se ocorrer um erro.
    console.log("[API Route] Iniciando transação com banco de dados...");

    const newApplication = await prisma.$transaction(async (tx) => {
      // a) Cria o registro da Aplicação principal
      const createdApp = await tx.application.create({
        data: {
          // Mapeia os campos do formulário para o modelo Application
          fullName: fields.fullName,
          address: fields.address,
          phone: fields.phone,
          email: fields.email,
          profession: fields.profession,
          maritalStatus: fields.maritalStatus,
          bank: fields.bank,
          agency: fields.agency,
          accountNumber: fields.accountNumber,
          accountType: fields.accountType,
          status: 'pending_analysis', // Define o status inicial
          // Conecta com a oferta existente usando o offerId vindo do formulário
          offer: {
            connect: { id: fields.offerId }
          }
          // createdAt e updatedAt são definidos automaticamente
        }
      });

      console.log(`[API Route] Registro Application criado com ID: ${createdApp.id}`);

      // b) Cria os registros dos Arquivos Enviados, associando ao ID da aplicação criada
      await tx.uploadedFile.createMany({
        data: uploadedFilesData.map(fileData => ({
          applicationId: createdApp.id, // Associa ao ID da aplicação recém-criada
          fieldName: fileData.fieldName,
          r2Key: fileData.r2Key,
          originalFilename: fileData.originalFilename,
          mimetype: fileData.mimetype,
          size: fileData.size,
        })),
      });

      console.log(`[API Route] ${uploadedFilesData.length} registros UploadedFile criados.`);

      // c) Opcional: Atualizar o status da Oferta original para 'accepted' (ou similar)
      // await tx.offer.update({
      //   where: { id: fields.offerId },
      //   data: { status: 'accepted' }, // Ou outro status apropriado
      // });
      // console.log(`[API Route] Status da Offer ${fields.offerId} atualizado.`);

      return createdApp; // Retorna a aplicação criada da transação
    });

    // Se chegou aqui, a transação foi bem-sucedida
    console.log('[API Route] Transação com banco de dados concluída com sucesso.');
    res.status(201).json({ message: 'Aplicação recebida com sucesso! Seus dados estão em análise.' });

  } catch (error) {
    console.error("[API Route] Erro durante upload para R2 ou transação com DB:", error);
    uploadError = error;
    // Tenta responder com erro específico do Prisma se disponível
    if (error.code && error.meta) { // Erro conhecido do Prisma
         console.error("Erro Prisma:", error.code, error.meta);
         res.status(400).json({ message: `Erro ao salvar dados: ${error.meta.target || error.code}` });
    } else { // Erro genérico
         res.status(500).json({ message: `Erro interno no servidor: ${error.message}` });
    }

  } finally {
      // --- 3. Limpeza dos Arquivos Temporários ---
      // Limpa os arquivos temporários do formidable independentemente de sucesso ou falha
      console.log("[API Route] Limpando arquivos temporários...");
      tempFilePaths.forEach(filePath => {
          if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err) => {
                  if (err) console.error(`[API Route] Erro ao remover arquivo temporário ${filePath}:`, err);
              });
          }
      });
  }
}

