// pages/admin/dashboard.js
import React, { useState, useCallback } from 'react'; // Removido useEffect
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2, AlertTriangle, Inbox, Check, X, LogOut } from 'lucide-react';
import { getIronSession } from 'iron-session'; // Importar getIronSession
import { sessionOptions } from '../../lib/session'; // Importar opções da sessão
import prisma from '../../lib/prisma'; // Importar prisma para buscar dados no servidor

// --- Helpers (podem ir para utils) ---
const formatCurrency = (value) => {
    // Recebe string ou número, pois Prisma pode retornar Decimal como string via JSON, mas aqui vem direto
    const number = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof number !== 'number' || isNaN(number)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};
const formatDate = (date) => { // Recebe objeto Date diretamente
    if (!date) return '-';
    // Verifica se é um objeto Date válido
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date)) {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    // Tenta converter se for string (fallback, idealmente viria como Date)
    const parsedDate = new Date(date);
     if (!isNaN(parsedDate)) {
        return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
     }
    return '-';
};

// --- Componente da Página ---
// Agora recebe 'applications' e 'adminUser' como props do getServerSideProps
export default function AdminDashboard({ applications: initialApplications, adminUser }) {
  const router = useRouter();

  // Estado local apenas para UI (updates, erros de update/logout)
  const [applications, setApplications] = useState(initialApplications || []); // Inicia com dados do SSR
  const [isUpdating, setIsUpdating] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [generalError, setGeneralError] = useState(null); // Erro geral para logout, etc.

  // Função para Atualizar Status (continua igual, mas atualiza estado local)
  const handleUpdateStatus = useCallback(async (applicationId, newStatus) => {
    setIsUpdating(applicationId);
    setUpdateError(null);
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ status: newStatus }),
      });
      const updatedApplication = await response.json();
      if (!response.ok) { throw new Error(updatedApplication.message || `Erro ${response.status}`); }
      // Atualiza o estado local para UI imediata
      setApplications(currentApplications => currentApplications.map(app => app.id === applicationId ? updatedApplication : app ));
    } catch (err) {
      console.error(`Erro ao atualizar status da aplicação ${applicationId}:`, err);
      setUpdateError(`Erro ao atualizar ${applicationId}: ${err.message}`);
    } finally {
      setIsUpdating(null);
    }
  }, []);

  // Função para Logout (continua igual)
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setUpdateError(null);
    setGeneralError(null);
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await response.json();
        if (response.ok && data.isLoggedIn === false) {
            router.push('/admin/login'); // Redireciona
        } else {
            throw new Error(data.message || 'Falha ao fazer logout.');
        }
    } catch (err) {
        console.error("Erro no logout:", err);
        setGeneralError(`Erro ao fazer logout: ${err.message}`);
    } finally {
        setIsLoggingOut(false);
    }
  }, [router]);


  // --- Renderização ---
  // Não precisamos mais dos estados isLoading/error iniciais, pois getServerSideProps trata disso

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <Head> <title>Admin - Dashboard de Aplicações</title> </Head>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Administrativo</h1>
            {/* Mostra o email do admin logado */}
            <p className="text-gray-600">Bem-vindo(a), {adminUser?.email || 'Admin'}!</p>
        </div>
        {/* Botão de Logout */}
        <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70 disabled:cursor-wait">
            {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />} {isLoggingOut ? 'A sair...' : 'Sair'}
        </button>
         {/* Exibir erro de atualização ou logout */}
         {(updateError || generalError) && ( <div className="w-full mt-4 p-3 flex items-center gap-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md"> <AlertTriangle className="w-5 h-5 flex-shrink-0" /> <span>{updateError || generalError}</span> </div> )}
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-12 text-center text-gray-500"> <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-400" /> <p>Nenhuma aplicação encontrada.</p> </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* Cabeçalhos da tabela ... */}
                 <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Nome </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Nº Processo </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Data Submissão </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Status </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Ações </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  // Linhas da tabela ...
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900"> {app.fullName} </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500"> {app.offer?.caseNumber || 'N/A'} </td>
                    {/* Usar helper formatDate */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500"> {formatDate(app.createdAt)} </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm"> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ app.status === 'pending_analysis' ? 'bg-yellow-100 text-yellow-800' : app.status === 'approved' ? 'bg-green-100 text-green-800' : app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}> {app.status.replace('_', ' ')} </span> </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {app.status === 'pending_analysis' ? ( <> <button onClick={() => handleUpdateStatus(app.id, 'approved')} disabled={isUpdating === app.id} title="Aprovar" className={`p-1 rounded text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-wait ${isUpdating === app.id ? 'animate-pulse' : ''}`}> {isUpdating === app.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />} </button> <button onClick={() => handleUpdateStatus(app.id, 'rejected')} disabled={isUpdating === app.id} title="Rejeitar" className={`p-1 rounded text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-wait ${isUpdating === app.id ? 'animate-pulse' : ''}`}> {isUpdating === app.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4" />} </button> </> ) : ( <span className="text-gray-400">-</span> )}
                      <Link href={`/admin/applications/${app.id}`} className="text-indigo-600 hover:text-indigo-900 ml-2" title="Ver Detalhes">...</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}


// --- Função getServerSideProps ---
// Roda no servidor ANTES da página ser renderizada
export async function getServerSideProps(context) {
  // Obtém a sessão a partir da requisição (req) e resposta (res)
  const session = await getIronSession(context.req, context.res, sessionOptions);

  // 1. Verifica se existe um utilizador admin na sessão
  if (!session.adminUser || !session.adminUser.id) {
    console.log("[getServerSideProps /admin/dashboard] Sessão admin inválida. Redirecionando para login.");
    // Se não houver, redireciona para a página de login
    return {
      redirect: {
        destination: '/admin/login', // URL de destino
        permanent: false, // Não é um redirecionamento permanente
      },
    };
  }

  // 2. Se a sessão for válida, busca os dados das aplicações no servidor
  console.log("[getServerSideProps /admin/dashboard] Sessão válida. Buscando aplicações...");
  try {
    const applicationsData = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        offer: { select: { caseNumber: true, offerAmount: true } } // Inclui dados da oferta
        // Não precisamos incluir _count aqui, mas poderíamos
      }
    });

     // 3. Prepara os dados para serem passados como props
     // É importante serializar dados complexos como Date e Decimal
     const applications = applicationsData.map(app => ({
        ...app,
        // Converte Date para string ISO (ou timestamp) - JSON não suporta Date
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
        // Converte Decimal para string - JSON não suporta Decimal
        offer: app.offer ? {
            ...app.offer,
            offerAmount: app.offer.offerAmount?.toString(), // Converte Decimal para string
        } : null,
    }));


    console.log(`[getServerSideProps /admin/dashboard] ${applications.length} aplicações encontradas.`);

    // Retorna os dados como props para o componente da página
    return {
      props: {
        applications, // Passa a lista de aplicações
        adminUser: session.adminUser, // Passa os dados do utilizador logado
      },
    };
  } catch (error) {
      console.error("[getServerSideProps /admin/dashboard] Erro ao buscar aplicações:", error);
      // Em caso de erro ao buscar dados, pode retornar props vazias ou uma flag de erro
      return {
          props: {
              applications: [],
              adminUser: session.adminUser, // Ainda passa o user se a sessão for válida
              serverError: "Erro ao carregar dados das aplicações." // Passa um erro para o componente
          }
      }
  }
}

