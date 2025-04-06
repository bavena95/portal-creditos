// pages/api/auth/logout.js
import { getIronSession } from 'iron-session';
// CORREÇÃO: Ajustar o caminho relativo para subir até a raiz do projeto
import { sessionOptions } from '../../../lib/session'; // Importa as opções configuradas

export default async function logoutRoute(req, res) {
  // Aceitar apenas requisições POST para logout (boa prática)
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  try {
    // Obtém a sessão atual
    const session = await getIronSession(req, res, sessionOptions);

    // Destrói a sessão (remove os dados e o cookie)
    session.destroy();

    console.log("[API Logout] Sessão destruída com sucesso.");

    // Retorna uma resposta indicando sucesso e que o utilizador não está mais logado
    res.status(200).json({ isLoggedIn: false });

  } catch (error) {
    console.error("[API Logout] Erro durante o logout:", error);
    res.status(500).json({ message: `Erro interno no servidor: ${error.message}` });
  }
}
