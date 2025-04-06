// pages/api/admin/files/[fileId]/download.js
import prisma from '../../../../../lib/prisma'; // Ajuste o caminho conforme necessário
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getIronSession } from 'iron-session'; // Importar getIronSession
import { sessionOptions } from '../../../../../lib/session'; // Importar opções da sessão

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
const SIGNED_URL_EXPIRES_IN = 300; // 5 minutos

export default async function handler(req, res) {
  // --- Validação da Sessão Interna (Adicionada) ---
  const session = await getIronSession(req, res, sessionOptions);
  if (!session.adminUser || !session.adminUser.id) {
    console.warn(`[API /api/admin/files/${req.query.fileId}/download] Tentativa de acesso sem sessão admin válida.`);
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }
  // Se chegou aqui, a sessão é válida para esta requisição.
  console.log(`[API /api/admin/files/${req.query.fileId}/download] Acesso permitido para admin: ${session.adminUser.email}`);
  // --- Fim da Validação da Sessão ---


  // Extrai o ID do arquivo da URL
  const { fileId } = req.query;

  // Aceitar apenas requisições GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ message: 'ID do arquivo inválido na URL.' });
  }
  if (!R2_BUCKET_NAME) {
     console.error("[API Route Download] Erro: R2_BUCKET_NAME não configurado.");
     return res.status(500).json({ message: 'Erro de configuração do servidor [Bucket].' });
  }


  try {
    // 1. Buscar informações do arquivo no Banco de Dados
    console.log(`[API Route Download] Buscando arquivo ID: ${fileId}`);
    const fileRecord = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
      select: { r2Key: true, originalFilename: true }
      // TODO: Adicionar verificação de permissão aqui?
      // O admin logado (session.adminUser.id) tem permissão para ver este ficheiro específico?
      // Isso pode envolver verificar a aplicação associada ao ficheiro.
    });

    if (!fileRecord || !fileRecord.r2Key) {
      console.warn(`[API Route Download] Registro do arquivo não encontrado ou sem r2Key: ID ${fileId}`);
      return res.status(404).json({ message: `Arquivo com ID ${fileId} não encontrado ou inválido.` });
    }

    // 2. Gerar URL Pré-Assinada do R2
    console.log(`[API Route Download] Gerando URL pré-assinada para R2 Key: ${fileRecord.r2Key}`);
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileRecord.r2Key,
      ResponseContentDisposition: `attachment; filename="${fileRecord.originalFilename || 'download'}"`,
    });
    const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRES_IN });
    console.log(`[API Route Download] URL gerada com sucesso para ${fileRecord.r2Key}`);

    // 3. Retornar a URL para o Frontend
    res.status(200).json({ downloadUrl: preSignedUrl });

  } catch (error) {
    console.error(`[API Route Download] Erro ao gerar link de download para arquivo ID: ${fileId}:`, error);
     if (error.code === 'P2025') { // Erro Prisma "Not Found" (embora findUnique retorne null)
         return res.status(404).json({ message: `Arquivo com ID ${fileId} não encontrado.` });
     }
    res.status(500).json({ message: `Erro interno no servidor ao gerar link de download: ${error.message}` });
  }
}
