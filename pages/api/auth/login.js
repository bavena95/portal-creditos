// pages/api/auth/login.js
import prisma from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import { getIronSession } from 'iron-session'; // Importa getIronSession diretamente
import { sessionOptions } from '../../../lib/session'; // Importa as opções configuradas

// NÃO envolvemos mais com withSessionApiRoute aqui
export default async function loginRoute(req, res) {
  // Aceitar apenas requisições POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido.` });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // --- 1. Encontrar o Utilizador Admin ---
    console.log(`[API Login] Tentando encontrar admin com email: ${email}`);
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!adminUser) {
      console.warn(`[API Login] Utilizador não encontrado para email: ${email}`);
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // --- 2. Verificar a Senha ---
    console.log(`[API Login] Utilizador encontrado (ID: ${adminUser.id}). Verificando senha...`);
    const passwordIsValid = await bcrypt.compare(password, adminUser.passwordHash);

    if (!passwordIsValid) {
      console.warn(`[API Login] Senha inválida para utilizador ID: ${adminUser.id}`);
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // --- 3. Credenciais Válidas - Obter e Modificar Sessão ---
    console.log(`[API Login] Senha válida para utilizador ID: ${adminUser.id}. Obtendo/criando sessão...`);

    // Obtém o objeto de sessão usando getIronSession
    const session = await getIronSession(req, res, sessionOptions);

    // Guarda informações do utilizador na sessão
    session.adminUser = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
    };

    // Salva a sessão (encripta os dados e define o cookie)
    await session.save();

    console.log(`[API Login] Sessão salva com sucesso para utilizador ID: ${adminUser.id}`);

    // Retorna os dados do utilizador (sem dados sensíveis)
    res.status(200).json({
        isLoggedIn: true,
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name
     });

  } catch (error) {
    console.error("[API Login] Erro durante o processo de login:", error);
    // Limpa a sessão em caso de erro durante o processo após validação? Opcional.
    // const session = await getIronSession(req, res, sessionOptions);
    // session.destroy();
    res.status(500).json({ message: `Erro interno no servidor: ${error.message}` });
  }
}

