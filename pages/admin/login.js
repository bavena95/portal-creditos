// pages/admin/login.js
import React, { useState } from 'react';
import { useRouter } from 'next/router'; // Para redirecionamento após login
import Head from 'next/head';
import { LogIn, Mail, Lock, Loader2, AlertTriangle } from 'lucide-react'; // Ícones

export default function LoginPage() {
  const router = useRouter(); // Hook para controlar a navegação

  // --- Estados do Componente ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Estado de carregamento do login
  const [error, setError] = useState(null); // Mensagem de erro

  // --- Função para Lidar com o Login ---
  const handleLogin = async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Envia email e senha
      });

      const data = await response.json();

      if (response.ok) {
        // Login bem-sucedido! A API já definiu o cookie de sessão.
        console.log('Login bem-sucedido:', data);
        // Redireciona para o dashboard administrativo
        router.push('/admin/dashboard');
      } else {
        // Erro no login (ex: credenciais inválidas, erro do servidor)
        console.error('Erro no login:', data.message);
        setError(data.message || 'Ocorreu um erro ao tentar fazer login.');
      }
    } catch (err) {
      console.error('Erro de rede ou fetch:', err);
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsLoading(false); // Finaliza o estado de carregamento
    }
  };

  // --- Renderização ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-indigo-100 px-4">
      <Head>
        <title>Admin Login - Portal de Créditos</title>
      </Head>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Login Administrativo</h1>
          <p className="mt-2 text-sm text-gray-600">Acesso restrito à equipa.</p>
        </div>

        {/* Exibição de Erro */}
        {error && (
          <div className="p-3 flex items-center gap-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="w-5 h-5 text-gray-400" />
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-gray-400" />
              </span>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Botão de Login */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5 mr-2" />
            )}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

