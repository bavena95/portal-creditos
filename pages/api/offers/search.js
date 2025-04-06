// pages/api/offers/search.js
import prisma from '../../../lib/prisma'; // Importa a instância única do Prisma Client

export default async function handler(req, res) {
  // Permitir apenas requisições POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  const { searchType, searchTerm } = req.body;

  console.log(`[API Route] Received search request: type=${searchType}, term=${searchTerm}`);

  if (!searchType || !searchTerm) {
    return res.status(400).json({ message: 'Tipo de busca (searchType) e termo de busca (searchTerm) são obrigatórios.' });
  }

  let result = null;
  const term = searchTerm.trim();

  try {
    // --- Lógica de Busca usando Prisma ---
    if (searchType === 'caseNumber') {
      // Busca uma oferta única pelo número do processo (que definimos como @unique no schema)
      result = await prisma.offer.findUnique({
        where: {
          caseNumber: term,
          // Poderia adicionar status: 'available' se necessário:
          // AND: { status: 'available' }, // Descomente se quiser filtrar por status
        },
        // Seleciona apenas os campos necessários para retornar ao frontend
        select: {
          id: true,
          caseNumber: true,
          name: true,
          offerAmount: true,
          status: true, // Inclui o status para possível lógica no frontend
        }
      });
      // Filtra explicitamente pelo status 'available' após a busca, se necessário
      if (result && result.status !== 'available') {
           console.log(`[API Route] Offer found but not available: ${result.caseNumber}`);
           result = null; // Trata como não encontrado se não estiver disponível
      }

    } else if (searchType === 'name') {
      // Busca a primeira oferta que corresponde ao nome (ignorando maiúsculas/minúsculas)
      // e que esteja disponível. Nome não é único, então usamos findFirst.
      result = await prisma.offer.findFirst({
        where: {
          name: {
            equals: term,
            mode: 'insensitive', // Ignora case (maiúsculas/minúsculas)
          },
          status: 'available', // Busca apenas ofertas disponíveis
        },
        // Seleciona apenas os campos necessários
        select: {
          id: true,
          caseNumber: true,
          name: true,
          offerAmount: true,
          status: true,
        }
      });
    } else {
      return res.status(400).json({ message: 'Tipo de busca inválido. Use "caseNumber" ou "name".' });
    }

    // --- Resposta ---
    if (result) {
      console.log(`[API Route] Offer found in DB:`, result);
      // Retorna os detalhes da oferta. Prisma lida bem com Decimal para JSON.
      res.status(200).json(result);
    } else {
      console.log(`[API Route] Offer not found in DB for term: ${searchTerm}`);
      res.status(404).json({ message: 'Nenhuma oferta disponível encontrada para os dados informados.' });
    }
  } catch (error) {
    console.error("[API Route] Error during database search:", error);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar oferta.' });
  }
}


      