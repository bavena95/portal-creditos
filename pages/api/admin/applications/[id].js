// pages/api/admin/applications/[id].js
import prisma from '../../../../lib/prisma';
import { getIronSession } from 'iron-session'; // Importar getIronSession
import { sessionOptions } from '../../../../lib/session'; // Importar opções da sessão

// Define os status permitidos para atualização
const ALLOWED_UPDATE_STATUSES = ['pending_analysis', 'approved', 'rejected'];

export default async function handler(req, res) {
  // --- Validação da Sessão Interna (Adicionada) ---
  const session = await getIronSession(req, res, sessionOptions);
  if (!session.adminUser || !session.adminUser.id) {
    console.warn(`[API /api/admin/applications/${req.query.id}] Tentativa de acesso sem sessão admin válida.`);
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }
  // Se chegou aqui, a sessão é válida para esta requisição.
  console.log(`[API /api/admin/applications/${req.query.id}] Acesso permitido para admin: ${session.adminUser.email}`);
  // --- Fim da Validação da Sessão ---

  // Extrai o ID da aplicação da URL (parâmetro dinâmico)
  const { id: applicationId } = req.query;

  if (!applicationId || typeof applicationId !== 'string') {
    return res.status(400).json({ message: 'ID da aplicação inválido na URL.' });
  }

  // --- Handler para GET (Buscar Detalhes) ---
  if (req.method === 'GET') {
    try {
      console.log(`[API Route GET] Buscando detalhes da aplicação ID: ${applicationId}`);
      const applicationDetails = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          offer: { select: { caseNumber: true, offerAmount: true } },
          uploadedFiles: {
            select: { id: true, fieldName: true, r2Key: true, originalFilename: true, mimetype: true, size: true, createdAt: true },
            orderBy: { fieldName: 'asc' }
          }
        }
      });

      if (!applicationDetails) {
        console.warn(`[API Route GET] Aplicação não encontrada: ID ${applicationId}`);
        return res.status(404).json({ message: `Aplicação com ID ${applicationId} não encontrada.` });
      }

      console.log(`[API Route GET] Detalhes encontrados para ID: ${applicationId}`);
      res.status(200).json(applicationDetails);

    } catch (error) {
      console.error(`[API Route GET] Erro ao buscar detalhes da aplicação ID: ${applicationId}:`, error);
      res.status(500).json({ message: `Erro interno no servidor ao buscar detalhes: ${error.message}` });
    }
  }
  // --- Handler para PATCH (Atualizar Status) ---
  else if (req.method === 'PATCH') {
    try {
      const { status: newStatus } = req.body;

      if (!newStatus) { return res.status(400).json({ message: 'Novo status (status) é obrigatório.' }); }
      if (!ALLOWED_UPDATE_STATUSES.includes(newStatus)) { return res.status(400).json({ message: `Status inválido: '${newStatus}'.` }); }

      console.log(`[API Route PATCH] Tentando atualizar status da aplicação ID: ${applicationId} para: ${newStatus}`);
      const updatedApplication = await prisma.application.update({
        where: { id: applicationId },
        data: { status: newStatus },
      });

      console.log(`[API Route PATCH] Aplicação ID: ${applicationId} atualizada com sucesso.`);
      res.status(200).json(updatedApplication);

    } catch (error) {
      if (error.code === 'P2025') {
        console.warn(`[API Route PATCH] Aplicação não encontrada para atualização: ID ${applicationId}`);
        return res.status(404).json({ message: `Aplicação com ID ${applicationId} não encontrada.` });
      }
      console.error(`[API Route PATCH] Erro ao atualizar status da aplicação ID: ${applicationId}:`, error);
      res.status(500).json({ message: `Erro interno no servidor ao atualizar status: ${error.message}` });
    }
  }
  // --- Método não permitido ---
  else {
    res.setHeader('Allow', ['GET', 'PATCH']);
    res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }
}
