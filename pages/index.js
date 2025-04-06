// pages/index.js
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
// Importar mais ícones para o formulário
import {
  Search, FileText, User, Loader2, AlertCircle, Clock, CheckCircle,
  Home, Phone, Mail, Briefcase, Info, Landmark, CreditCard, FileUp, Building, Check // Adicionado Ícones
} from 'lucide-react';

// Helper function to format currency
const formatCurrency = (value) => {
  // Adiciona verificação se o valor é um número válido após parseFloat
  if (typeof value !== 'number' || isNaN(value)) {
     // console.warn("formatCurrency received invalid value:", value); // Log para debug
     return 'R$ -'; // Retorna um placeholder ou string vazia
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper function to format time
const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};


// Componente principal da página inicial
export default function HomePage() {
  // --- Estados do Componente ---
  const [currentView, setCurrentView] = useState('search'); // 'search', 'offer', 'form', 'confirmation'
  // Estados da Busca
  const [searchType, setSearchType] = useState('caseNumber');
  const [searchTerm, setSearchTerm] = useState('');
  // Estados da Oferta
  const [offerDetails, setOfferDetails] = useState(null);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  // Estados do Formulário
  const [formData, setFormData] = useState({
    fullName: '', address: '', phone: '', email: '', profession: '', maritalStatus: '',
    bank: '', agency: '', accountNumber: '', accountType: 'corrente',
  });
  const [files, setFiles] = useState({
    residenceProof: null, idDocument: null, taxClearance: null,
    laborDebtsClearance: null, tstCertificate: null,
  });
  // Estados Gerais
  const [isLoading, setIsLoading] = useState(false); // Usado para busca e submissão
  const [errorMessage, setErrorMessage] = useState('');

  // --- Pré-preencher nome no formulário quando a oferta é aceita ---
  useEffect(() => {
    if (currentView === 'form' && offerDetails) {
      setFormData(prev => ({ ...prev, fullName: offerDetails.name || '' }));
    }
  }, [currentView, offerDetails]);


  // --- Função para Lidar com a Busca ---
  const handleSearch = useCallback(async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    setOfferDetails(null);
    setCurrentView('search');
    try {
      const response = await fetch('/api/offers/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ searchType, searchTerm }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Oferta recebida da API:', data); // Log para verificar o tipo de offerAmount
        setOfferDetails(data);
        setTimeLeft(24 * 60 * 60);
        setCurrentView('offer');
        setSearchTerm('');
      } else {
        setErrorMessage(data.message || 'Ocorreu um erro ao buscar a oferta.');
        setCurrentView('search');
      }
    } catch (error) {
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.');
      setCurrentView('search');
    } finally {
      setIsLoading(false);
    }
  }, [searchType, searchTerm]);

  // --- Lógica do Contador Regressivo ---
  useEffect(() => {
    if (currentView !== 'offer' || !offerDetails) return;
    if (timeLeft <= 0) {
      setErrorMessage('O tempo para aceitar esta oferta expirou.');
      setOfferDetails(null); setCurrentView('search'); return;
    }
    const intervalId = setInterval(() => { setTimeLeft((prevTime) => prevTime - 1); }, 1000);
    return () => clearInterval(intervalId);
  }, [currentView, offerDetails, timeLeft]);

  // --- Funções para Lidar com o Formulário ---

  // Atualiza estado dos campos de texto/select
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Atualiza estado dos arquivos
  const handleFileChange = (e) => {
    const { name, files: inputFiles } = e.target;
    if (inputFiles.length > 0) {
      setFiles(prev => ({ ...prev, [name]: inputFiles[0] }));
    } else {
       setFiles(prev => ({ ...prev, [name]: null }));
    }
  };

  // Lida com a submissão do formulário
  const handleSubmitForm = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    // Validação Simples (Cliente)
    const requiredFields = ['fullName', 'address', 'phone', 'email', 'profession', 'maritalStatus', 'bank', 'agency', 'accountNumber', 'accountType'];
    const missingField = requiredFields.find(field => !formData[field] || !formData[field].trim());
    if (missingField) {
      setErrorMessage(`Campo obrigatório não preenchido: ${missingField}`); setIsLoading(false); return;
    }
    const requiredFiles = ['residenceProof', 'idDocument', 'taxClearance', 'laborDebtsClearance', 'tstCertificate'];
    const missingFile = requiredFiles.find(fileKey => !files[fileKey]);
    if (missingFile) {
      setErrorMessage(`Documento obrigatório não enviado: ${missingFile}`); setIsLoading(false); return;
    }

    // Preparar FormData para Envio
    const dataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => { dataToSend.append(key, value); });
    Object.entries(files).forEach(([key, file]) => { if (file) { dataToSend.append(key, file); } });
     if (offerDetails?.id) { dataToSend.append('offerId', offerDetails.id); }
     else { setErrorMessage('Erro: ID da oferta não encontrado.'); setIsLoading(false); return; }

    // Chamar API de Submissão
    try {
      const response = await fetch('/api/applications', { method: 'POST', body: dataToSend, });
      const result = await response.json();
      if (response.ok) {
        setCurrentView('confirmation');
        setOfferDetails(null);
        setFormData({ fullName: '', address: '', phone: '', email: '', profession: '', maritalStatus: '', bank: '', agency: '', accountNumber: '', accountType: 'corrente' }); // Reset form
        setFiles({ residenceProof: null, idDocument: null, taxClearance: null, laborDebtsClearance: null, tstCertificate: null }); // Reset files
      } else {
        setErrorMessage(result.message || 'Ocorreu um erro ao enviar a aplicação.');
      }
    } catch (error) {
      setErrorMessage('Não foi possível conectar ao servidor para enviar a aplicação.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Renderização do Componente ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 py-12 px-4 font-sans">
      <Head>
        <title>{`Portal de Créditos Judiciais - ${currentView === 'search' ? 'Buscar Oferta' : currentView === 'offer' ? 'Sua Oferta' : currentView === 'form' ? 'Completar Dados' : 'Confirmação'}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 text-center">
        {/* Logo/Título (Sempre visível) */}
        <div className="mb-8">
           <h1 className="text-4xl font-bold text-indigo-800 mb-2">
             Portal de Créditos Judiciais
           </h1>
           <p className="text-lg text-gray-600">
             {currentView === 'search' && 'Consulte sua oferta pré-aprovada rapidamente.'}
             {currentView === 'offer' && 'Detalhes da sua oferta pré-aprovada.'}
             {currentView === 'form' && 'Complete seus dados para finalizar a cessão.'}
             {currentView === 'confirmation' && 'Aplicação enviada com sucesso!'}
           </p>
        </div>

        {/* --- View: Busca --- */}
        {currentView === 'search' && (
          <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl animate-fade-in">
            <h2 className="text-2xl font-semibold text-center text-gray-700">Localizar Oferta</h2>
            {errorMessage && ( <div className="p-3 flex items-center gap-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md"> <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{errorMessage}</span> </div> )}
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Seletor Tipo Busca */}
              <div>
                <label htmlFor="searchType" className="block text-sm font-medium text-gray-700 mb-1 text-left">Buscar por:</label>
                <select id="searchType" name="searchType" value={searchType} onChange={(e) => setSearchType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"> <option value="caseNumber">Número do Processo</option> <option value="name">Nome Completo</option> </select>
              </div>
              {/* Campo Busca */}
              <div>
                <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1 text-left">{searchType === 'caseNumber' ? 'Número do Processo' : 'Nome Completo'}</label>
                <div className="relative"> <span className="absolute inset-y-0 left-0 flex items-center pl-3">{searchType === 'caseNumber' ? <FileText className="w-5 h-5 text-gray-400" /> : <User className="w-5 h-5 text-gray-400" />}</span> <input type="text" id="searchTerm" name="searchTerm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={searchType === 'caseNumber' ? 'Ex: 0000123-45.2024.8.26.0001' : 'Ex: João da Silva'} className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required /> </div>
              </div>
              {/* Botão Busca */}
              <button type="submit" disabled={isLoading || !searchTerm.trim()} className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"> {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />} {isLoading ? 'Buscando...' : 'Buscar Oferta'} </button>
            </form>
          </div>
        )}

        {/* --- View: Oferta --- */}
        {currentView === 'offer' && offerDetails && (
          <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-indigo-700">Oferta Pré-Aprovada Encontrada!</h2>
            <p className="text-gray-600">Olá, <span className="font-semibold">{offerDetails.name}</span>. Processo <span className="font-semibold">{offerDetails.caseNumber}</span>.</p>
            {/* Valor */}
            <div className="p-6 my-4 bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-lg shadow-inner">
              <p className="text-sm font-medium text-green-700 uppercase tracking-wider">Valor da Oferta</p>
              {/* CORREÇÃO APLICADA AQUI: parseFloat */}
              <p className="text-4xl font-bold text-green-800 my-2">{formatCurrency(parseFloat(offerDetails.offerAmount))}</p>
            </div>
            {/* Contador */}
            <div className="p-4 my-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-center justify-center text-amber-700 mb-2"> <Clock className="w-6 h-6 mr-2" /> <span className="text-lg font-semibold">Tempo Restante para Aceitar</span> </div>
              <p className="text-3xl font-mono font-bold text-amber-800 tracking-wider">{formatTime(timeLeft)}</p>
            </div>
            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button onClick={() => setCurrentView('form')} className="w-full sm:w-auto flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"> <CheckCircle className="w-5 h-5 mr-2" /> Aceitar Oferta e Continuar </button>
              <button onClick={() => { setOfferDetails(null); setCurrentView('search'); setErrorMessage(''); }} className="w-full sm:w-auto flex justify-center items-center py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"> Recusar e Voltar </button>
            </div>
          </div>
        )}

         {/* --- View: Formulário --- */}
         {currentView === 'form' && (
            <div className="w-full max-w-3xl p-6 sm:p-8 space-y-8 bg-white rounded-lg shadow-xl animate-fade-in">
              <h2 className="text-2xl font-bold text-center text-gray-800">Complete seus Dados</h2>
              <p className="text-center text-gray-600 text-sm">Preencha as informações abaixo e envie os documentos para análise.</p>
              {errorMessage && ( <div className="p-3 flex items-center gap-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md"> <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span>{errorMessage}</span> </div> )}
              <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Seção: Informações Pessoais */}
                <section className="p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-indigo-600"/>Informações Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div> <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nome Completo</label> <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50" readOnly={!!offerDetails?.name} /> </div>
                    <div> <label htmlFor="address" className="block text-sm font-medium text-gray-700">Endereço Completo</label> <input type="text" name="address" id="address" value={formData.address} onChange={handleInputChange} required placeholder="Rua, Nº, Bairro, Cidade, Estado, CEP" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/> </div>
                    <div> <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label> <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><Phone className="w-4 h-4 text-gray-400"/></span><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/></div> </div>
                    <div> <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail</label> <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><Mail className="w-4 h-4 text-gray-400"/></span><input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required placeholder="seuemail@exemplo.com" className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/></div> </div>
                    <div> <label htmlFor="profession" className="block text-sm font-medium text-gray-700">Profissão</label> <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><Briefcase className="w-4 h-4 text-gray-400"/></span><input type="text" name="profession" id="profession" value={formData.profession} onChange={handleInputChange} required className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/></div> </div>
                    <div> <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700">Estado Civil</label> <select name="maritalStatus" id="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"> <option value="">Selecione...</option> <option value="solteiro">Solteiro(a)</option> <option value="casado">Casado(a)</option> <option value="divorciado">Divorciado(a)</option> <option value="viuvo">Viúvo(a)</option> <option value="uniao_estavel">União Estável</option> </select> </div>
                  </div>
                </section>
                {/* Seção: Dados Bancários */}
                <section className="p-4 border border-gray-200 rounded-md">
                   <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><Landmark className="w-5 h-5 mr-2 text-indigo-600"/>Dados Bancários</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div> <label htmlFor="bank" className="block text-sm font-medium text-gray-700">Banco</label> <input type="text" name="bank" id="bank" value={formData.bank} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/> </div>
                     <div> <label htmlFor="agency" className="block text-sm font-medium text-gray-700">Agência</label> <input type="text" name="agency" id="agency" value={formData.agency} onChange={handleInputChange} required placeholder="Ex: 0001" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/> </div>
                     <div> <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Número da Conta</label> <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><CreditCard className="w-4 h-4 text-gray-400"/></span><input type="text" name="accountNumber" id="accountNumber" value={formData.accountNumber} onChange={handleInputChange} required placeholder="Ex: 12345-6" className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/></div> </div>
                     <div> <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">Tipo de Conta</label> <select name="accountType" id="accountType" value={formData.accountType} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"> <option value="corrente">Conta Corrente</option> <option value="poupanca">Conta Poupança</option> </select> </div>
                   </div>
                </section>
                {/* Seção: Upload de Documentos */}
                 <section className="p-4 border border-gray-200 rounded-md">
                   <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><FileUp className="w-5 h-5 mr-2 text-indigo-600"/>Upload de Documentos</h3>
                   <p className="text-xs text-gray-500 mb-4">Formatos aceitos: PDF, JPG, PNG. Tamanho máx: 10MB por arquivo.</p>
                   <div className="space-y-3">
                     {['residenceProof', 'idDocument', 'taxClearance', 'laborDebtsClearance', 'tstCertificate'].map(fieldName => { /* ... código do input de arquivo ... */
                        const labels = { residenceProof: 'Comprovante de Residência (mês vigente)', idDocument: 'Foto do RG ou CNH', taxClearance: 'Certidão Negativa Débitos Tributários', laborDebtsClearance: 'Certidão Negativa Débitos Trabalhistas', tstCertificate: 'Certidão Trabalhista TST' };
                        const icons = { residenceProof: <Home className="w-4 h-4 mr-2 text-gray-500"/>, idDocument: <Info className="w-4 h-4 mr-2 text-gray-500"/>, taxClearance: <Building className="w-4 h-4 mr-2 text-gray-500"/>, laborDebtsClearance: <Briefcase className="w-4 h-4 mr-2 text-gray-500"/>, tstCertificate: <FileText className="w-4 h-4 mr-2 text-gray-500"/> };
                        return ( <div key={fieldName} className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4"> <label htmlFor={fieldName} className="text-sm font-medium text-gray-700 flex items-center whitespace-nowrap"> {icons[fieldName]} {labels[fieldName]} </label> <div className="flex items-center gap-2 w-full sm:w-auto"> <input type="file" name={fieldName} id={fieldName} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" /> {files[fieldName] ? ( <Check className="w-5 h-5 text-green-500 flex-shrink-0" title={files[fieldName].name}/> ) : ( <span className="w-5 h-5 flex-shrink-0"></span> )} </div> </div> );
                     })}
                   </div>
                 </section>
                {/* Botão de Submissão */}
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isLoading} className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"> {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />} {isLoading ? 'Enviando...' : 'Enviar Dados e Documentos'} </button>
                </div>
              </form>
            </div>
         )}

         {/* --- View: Confirmação --- */}
         {currentView === 'confirmation' && (
             <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl text-center animate-fade-in">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" /> <h2 className="text-2xl font-bold text-gray-800">Recebido com Sucesso!</h2> <p className="text-gray-600"> Seus dados e documentos foram enviados para análise. Nossa equipe entrará em contato em breve. </p> <p className="text-sm text-gray-500"> O processo de análise leva em média 24 horas úteis. Se aprovado, você receberá um link por e-mail para assinar eletronicamente a minuta do contrato de cessão de crédito. </p> <button onClick={() => { setCurrentView('search'); setErrorMessage(''); }} className="mt-6 w-full sm:w-auto inline-flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> Voltar ao Início </button>
             </div>
         )}

      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Seu Portal de Créditos. Todos os direitos reservados.
      </footer>

      {/* Estilo para animação simples de fade-in (opcional) */}
      <style jsx global>{` @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; } `}</style>
    </div>
  );
}
