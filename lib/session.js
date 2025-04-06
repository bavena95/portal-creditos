// Apenas exporta as opções de configuração

// Lê a senha secreta das variáveis de ambiente
const sessionPassword = process.env.SESSION_SECRET;

// Verifica se a senha secreta foi definida e tem o tamanho mínimo
if (!sessionPassword || sessionPassword.length < 32) {
  console.error("!!! Variável de ambiente SESSION_SECRET não definida ou muito curta (precisa ter pelo menos 32 caracteres) !!!");
  // Em produção, pode ser melhor lançar um erro para impedir a execução
  // throw new Error("SESSION_SECRET não configurada corretamente.");
}

// Define e exporta as opções para a sessão
export const sessionOptions = {
  password: sessionPassword, // A senha secreta para encriptar o cookie
  cookieName: "portal-creditos-session", // Nome do cookie que guardará a sessão
  // Opções de segurança do cookie (recomendadas)
  cookieOptions: {
    secure: process.env.NODE_ENV === "production", // Usar apenas HTTPS em produção
    maxAge: undefined, // undefined = cookie de sessão (expira quando o navegador fecha)
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  },
};

// --- Tipagem da Sessão (Opcional, mas boa prática) ---
// Define a estrutura esperada dos dados que guardaremos na sessão.
// declare module "iron-session" {
//   interface IronSessionData {
//     adminUser?: {
//       id: string;
//       email: string;
//       name?: string;
//     };
//   }
// }

