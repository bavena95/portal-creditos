// middleware.js
import { NextResponse } from 'next/server';
import { sessionOptions } from './lib/session'; // Importa as opções para pegar o nome do cookie

// Configuração para definir em quais rotas este middleware deve rodar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes that are NOT admin routes (needed for login, logout, etc.)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc. in /public)
     * But specifically include /admin and /api/admin routes.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)', // Matches general paths
    '/admin/:path*', // Matches all admin pages explicitly
    '/api/admin/:path*', // Matches all admin API routes explicitly
  ],
}

export function middleware(req) {
  // Pega o nome do cookie das opções importadas
  const cookieName = sessionOptions.cookieName;
  // Tenta obter o valor do cookie da requisição
  const sessionCookie = req.cookies.get(cookieName)?.value;
  // Obtém o caminho da URL requisitada
  const { pathname } = req.nextUrl;

  // --- Lógica de Proteção ---

  // 1. Proteger Páginas /admin/* (exceto /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Se não houver cookie de sessão, redireciona para a página de login
    if (!sessionCookie) {
      const loginUrl = new URL('/admin/login', req.url);
      // Adiciona um parâmetro 'from' para redirecionar de volta após o login (opcional)
      loginUrl.searchParams.set('from', pathname);
      console.log(`[Middleware] Sem sessão para ${pathname}. Redirecionando para ${loginUrl}`);
      return NextResponse.redirect(loginUrl);
    }
    // Se houver cookie, permite o acesso (a página/API deve validar o conteúdo da sessão internamente)
  }

  // 2. Proteger APIs /api/admin/*
  if (pathname.startsWith('/api/admin')) {
     // Se não houver cookie de sessão, retorna erro 401 (Não Autorizado)
     if (!sessionCookie) {
        console.log(`[Middleware] Sem sessão para API ${pathname}. Retornando 401.`);
        return new NextResponse(
            JSON.stringify({ message: 'Autenticação necessária.' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
     }
     // Se houver cookie, permite o acesso (a API route DEVE validar o conteúdo da sessão internamente usando getIronSession)
  }


  // 3. Redirecionar utilizador logado se tentar aceder /admin/login
  if (pathname === '/admin/login') {
    // Se houver cookie de sessão, redireciona para o dashboard
    if (sessionCookie) {
      const dashboardUrl = new URL('/admin/dashboard', req.url);
      console.log(`[Middleware] Utilizador logado tentou aceder ${pathname}. Redirecionando para ${dashboardUrl}`);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Se nenhuma das condições acima for atendida, permite que a requisição continue
  // console.log(`[Middleware] Permitindo acesso a ${pathname}`);
  return NextResponse.next();
}

