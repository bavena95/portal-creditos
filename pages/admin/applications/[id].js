// pages/admin/applications/[id].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router'; // Para pegar o ID da URL
import Head from 'next/head';
import Link from 'next/link';
import { Loader2, AlertTriangle, ArrowLeft, User, Home, Phone, Mail, Briefcase, Info, Landmark, CreditCard, FileText, Download, CheckCircle, XCircle, FileUp } from 'lucide-react'; // Ícones (FileUp adicionado)

// Helper para formatar moeda (pode mover para um arquivo utils)
const formatCurrency = (value) => {
  const number = parseFloat(value); // Converte string (do Decimal) para número
  if (typeof number !== 'number' || isNaN(number)) return 'R$ -';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

// Helper para formatar data (pode mover para um arquivo utils)
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Helper para formatar tamanho de arquivo (pode mover para um arquivo utils)
const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Componente da página de detalhes
export default function ApplicationDetailsPage() {
  const router = useRouter();
  const { id: applicationId } = router.query; // Pega o ID da aplicação da URL

  // --- Estados do Componente ---
  const [application, setApplication] = useState(null); // Guarda os detalhes da aplicação
  const [isLoading, setIsLoading] = useState(true); // Loading da página
  const [error, setError] = useState(null); // Erro ao carregar detalhes
  const [downloadingFileId, setDownloadingFileId] = useState(null); // ID do arquivo sendo baixado
  const [downloadError, setDownloadError] = useState(null); // Erro no download

  // --- Efeito para Buscar Detalhes da Aplicação ---
  useEffect(() => {
    // Só busca se o applicationId estiver disponível na URL
    if (applicationId) {
      const fetchDetails = async () => {
        setIsLoading(true);
        setError(null);
        setDownloadError(null);
        try {
          const response = await fetch(`/api/admin/applications/${applicationId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ${response.status}`);
          }
          const data = await response.json();
          setApplication(data);
        } catch (err) {
          console.error("Erro ao buscar detalhes da aplicação:", err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [applicationId]); // Executa sempre que o applicationId mudar

  // --- Função para Lidar com Download ---
  const handleDownload = async (fileId, filename) => {
    setDownloadingFileId(fileId);
    setDownloadError(null);
    console.log(`Tentando baixar arquivo ID: ${fileId}`);
    try {
      const response = await fetch(`/api/admin/files/${fileId}/download`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }

      if (data.downloadUrl) {
        console.log(`URL recebida: ${data.downloadUrl}`);
        // Abre o link em nova aba (mais seguro que window.location.href)
        // O 'attachment; filename="..."' na API deve sugerir o nome correto
        window.open(data.downloadUrl, '_blank');
      } else {
        throw new Error("URL de download não recebida da API.");
      }
    } catch (err) {
      console.error(`Erro ao baixar arquivo ${fileId}:`, err);
      setDownloadError(`Erro ao obter link para ${filename || fileId}: ${err.message}`);
    } finally {
      setDownloadingFileId(null); // Limpa o estado de loading do download
    }
  };


  // --- Renderização ---

  // Estado de Carregamento Inicial
  if (isLoading) {
    return ( <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div> );
  }

  // Estado de Erro no Carregamento
  if (error) {
    return ( <div className="flex flex-col items-center justify-center min-h-screen text-red-600 p-4"> <AlertTriangle className="w-12 h-12 mb-4" /> <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Aplicação</h2> <p className="text-center mb-4">{error}</p> <Link href="/admin/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"> Voltar ao Dashboard </Link> </div> );
  }

  // Aplicação não encontrada (após carregamento sem erro)
  if (!application) {
     return ( <div className="flex flex-col items-center justify-center min-h-screen text-gray-600 p-4"> <AlertTriangle className="w-12 h-12 mb-4" /> <h2 className="text-xl font-semibold mb-2">Aplicação Não Encontrada</h2> <Link href="/admin/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"> Voltar ao Dashboard </Link> </div> );
  }

  // --- Renderização dos Detalhes ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <Head>
        <title>Admin - Detalhes da Aplicação {application.id}</title>
      </Head>

      {/* Cabeçalho e Voltar */}
      <header className="mb-6 flex items-center justify-between">
        <div>
            <Link href="/admin/dashboard" className="text-indigo-600 hover:text-indigo-800 flex items-center mb-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Detalhes da Aplicação</h1>
            <p className="text-sm text-gray-500">ID: {application.id}</p>
        </div>
         {/* ALERTA DE SEGURANÇA */}
         <div className="mt-4 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md text-xs max-w-xs text-right">
           <AlertTriangle className="inline w-4 h-4 mr-1" />
           Página desprotegida!
         </div>
      </header>

       {/* Exibir erro de download */}
       {downloadError && ( <div className="mb-4 p-3 flex items-center gap-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md"> <AlertTriangle className="w-5 h-5 flex-shrink-0" /> <span>{downloadError}</span> </div> )}

      {/* Grid para Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna 1: Detalhes da Aplicação e Oferta */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Informações Pessoais */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-indigo-600"/>Informações do Cedente</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="sm:col-span-2"><dt className="font-medium text-gray-500">Nome Completo</dt><dd className="text-gray-900">{application.fullName}</dd></div>
              <div><dt className="font-medium text-gray-500">Email</dt><dd className="text-gray-900">{application.email}</dd></div>
              <div><dt className="font-medium text-gray-500">Telefone</dt><dd className="text-gray-900">{application.phone}</dd></div>
              <div className="sm:col-span-2"><dt className="font-medium text-gray-500">Endereço</dt><dd className="text-gray-900">{application.address}</dd></div>
              <div><dt className="font-medium text-gray-500">Profissão</dt><dd className="text-gray-900">{application.profession}</dd></div>
              <div><dt className="font-medium text-gray-500">Estado Civil</dt><dd className="text-gray-900">{application.maritalStatus}</dd></div>
            </dl>
          </section>

          {/* Card: Dados Bancários */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><Landmark className="w-5 h-5 mr-2 text-indigo-600"/>Dados Bancários</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="font-medium text-gray-500">Banco</dt><dd className="text-gray-900">{application.bank}</dd></div>
              <div><dt className="font-medium text-gray-500">Agência</dt><dd className="text-gray-900">{application.agency}</dd></div>
              <div><dt className="font-medium text-gray-500">Conta</dt><dd className="text-gray-900">{application.accountNumber}</dd></div>
              <div><dt className="font-medium text-gray-500">Tipo</dt><dd className="text-gray-900">{application.accountType}</dd></div>
            </dl>
          </section>

           {/* Card: Detalhes da Oferta Relacionada */}
           <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-indigo-600"/>Oferta Relacionada</h2>
            {application.offer ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="font-medium text-gray-500">Nº Processo</dt><dd className="text-gray-900">{application.offer.caseNumber}</dd></div>
                <div><dt className="font-medium text-gray-500">Valor Original da Oferta</dt><dd className="text-gray-900 font-semibold">{formatCurrency(application.offer.offerAmount)}</dd></div>
                </dl>
            ) : (
                <p className="text-sm text-gray-500">Informações da oferta não disponíveis.</p>
            )}
          </section>
        </div>

        {/* Coluna 2: Status e Arquivos */}
        <div className="lg:col-span-1 space-y-6">
           {/* Card: Status e Metadados */}
           <section className="bg-white p-6 rounded-lg shadow">
             <h2 className="text-xl font-semibold text-gray-700 mb-4">Status e Informações</h2>
             <dl className="space-y-2 text-sm">
               <div>
                 <dt className="font-medium text-gray-500">Status Atual</dt>
                 <dd className="mt-1">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${ application.status === 'pending_analysis' ? 'bg-yellow-100 text-yellow-800' : application.status === 'approved' ? 'bg-green-100 text-green-800' : application.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>
                        {application.status.replace('_', ' ')}
                    </span>
                 </dd>
               </div>
                <div><dt className="font-medium text-gray-500">Data de Submissão</dt><dd className="text-gray-900">{formatDate(application.createdAt)}</dd></div>
                <div><dt className="font-medium text-gray-500">Última Atualização</dt><dd className="text-gray-900">{formatDate(application.updatedAt)}</dd></div>
                {/* TODO: Adicionar botões de Ação (Aprovar/Rejeitar) aqui também? */}
             </dl>
           </section>

          {/* Card: Documentos Enviados */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><FileUp className="w-5 h-5 mr-2 text-indigo-600"/>Documentos Enviados</h2>
            {application.uploadedFiles && application.uploadedFiles.length > 0 ? (
              <ul className="space-y-3">
                {application.uploadedFiles.map((file) => (
                  <li key={file.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0">
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">{file.fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p> {/* Formata fieldName */}
                      <p className="text-xs text-gray-500 truncate max-w-xs" title={file.originalFilename}>{file.originalFilename || 'Nome não disponível'}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(file.size)} - {file.mimetype}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(file.id, file.originalFilename)}
                      disabled={downloadingFileId === file.id}
                      className="p-1.5 rounded text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-wait"
                      title={`Baixar ${file.originalFilename || 'arquivo'}`}
                    >
                      {downloadingFileId === file.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nenhum arquivo encontrado para esta aplicação.</p>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
