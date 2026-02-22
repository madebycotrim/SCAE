import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { autenticacao } from './servicos/firebase';
import { servicoSincronizacao } from './servicos/sincronizacao';
import { ProvedorAutenticacao } from './contexts/ContextoAutenticacao';
import { ProvedorPermissoes } from './contexts/ContextoPermissoes';
import { ProvedorNotificacoes } from './contexts/ContextoNotificacoes';
import RotaPrivada from './componentes/RotaPrivada';
import LeitorPortaria from './paginas/LeitorPortaria';
import Painel from './paginas/Painel';
import Turmas from './paginas/Turmas';
import Login from './paginas/Login';
import Alunos from './paginas/Alunos';
import Logs from './paginas/Logs';
import Relatorios from './paginas/Relatorios';
import Usuarios from './paginas/Usuarios';
import BancoDados from './paginas/BancoDados';
import { Toaster } from 'react-hot-toast';

function Layout({ children }) {
  // Não exibir navegação no login ou portaria (modo scanner)
  // const ocultarNavegacao = localizacao.pathname === '/login' || localizacao.pathname === '/portaria';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegação Global Removida */}
      <main className="flex-grow bg-gray-100">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  // Este bloco useEffect parece pertencer a um provedor de autenticação ou componente gerenciando estado do usuário.
  // Para fins de atender a solicitação, está colocado aqui, assumindo que 'auth', 'setUsuario', 'setCarregando'
  // e 'servicoSincronizacao' estariam devidamente definidos ou importados em um contexto de aplicação real.
  // Em uma aplicação React típica, esta lógica provavelmente residiria dentro de 'ProvedorAutenticacao'.
  const [, definirUsuario] = useState(null);
  const [, definirCarregando] = useState(true);

  useEffect(() => {
    // Inicializar Sincronização Automática Global
    servicoSincronizacao.iniciarSincronizacaoAutomatica();

    // v2.0 - Estado de Autenticação
    const cancelarInscricao = onAuthStateChanged(autenticacao, (usuarioFirebase) => {
      definirUsuario(usuarioFirebase);
      definirCarregando(false);
    });

    return () => cancelarInscricao();
  }, []);

  return (
    <Router>
      <ProvedorAutenticacao>
        <ProvedorPermissoes>
          <ProvedorNotificacoes>
            <Layout>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/leitor" element={
                  <RotaPrivada>
                    <LeitorPortaria />
                  </RotaPrivada>
                } />
                <Route path="/painel" element={
                  <RotaPrivada>
                    <Painel />
                  </RotaPrivada>
                } />
                <Route path="/alunos" element={
                  <RotaPrivada>
                    <Alunos />
                  </RotaPrivada>
                } />
                <Route path="/turmas" element={
                  <RotaPrivada>
                    <Turmas />
                  </RotaPrivada>
                } />
                <Route path="/relatorios" element={
                  <RotaPrivada>
                    <Relatorios />
                  </RotaPrivada>
                } />
                <Route path="/logs" element={
                  <RotaPrivada>
                    <Logs />
                  </RotaPrivada>
                } />
                <Route path="/usuarios" element={
                  <RotaPrivada>
                    <Usuarios />
                  </RotaPrivada>
                } />
                <Route path="/banco-dados" element={
                  <RotaPrivada>
                    <BancoDados />
                  </RotaPrivada>
                } />
                <Route path="*" element={<Navigate to="/painel" replace />} />
              </Routes>
            </Layout>
          </ProvedorNotificacoes>
        </ProvedorPermissoes>
      </ProvedorAutenticacao>
    </Router>
  );
}

export default App;
