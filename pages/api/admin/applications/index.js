// pages/api/admin/applications/index.js
import prisma from '../../../../lib/prisma';
import { getIronSession } from 'iron-session'; // Importar getIronSession
import { sessionOptions } from '../../../../lib/session'; // Importar opções da sessão

export default async function handler(req, res) {
  // --- Validação da Sessão Interna ---
  // Obtém a sessão para esta requisição específica
  const session = await getIronSession(req, res, sessionOptions);

  // Verifica se existe um utilizador admin válido na sessão
  if (!session.adminUser || !session.adminUser.id) {
    // Se não houver sessão válida, retorna erro 401 (Não Autorizado)
    // Mesmo que o middleware já possa ter bloqueado, esta é uma camada extra de segurança.
    console.warn("[API /api/admin/applications] Tentativa de acesso sem sessão admin válida.");
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }
  // Se chegou aqui, a sessão é considerada válida para esta requisição.
  console.log(`[API /api/admin/applications] Acesso permitido para admin: ${session.adminUser.email}`);
  // --- Fim da Validação da Sessão ---


  // Aceitar apenas requisições GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  try {
    // Buscar Aplicações no Banco de Dados (lógica principal)
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        offer: { select: { caseNumber: true } }
        // _count: { select: { uploadedFiles: true } } // Opcional
      }
      // TODO: Paginação
    });

    console.log(`[API Route] ${applications.length} aplicações encontradas.`);
    res.status(200).json(applications);

  } catch (error) {
    console.error("[API Route] Erro ao buscar aplicações:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar aplicações.' });
  }
}

