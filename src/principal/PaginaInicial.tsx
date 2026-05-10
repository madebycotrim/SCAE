import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Componentes Base
import { CabecalhoInicial } from './componentes/CabecalhoInicial';
import { RodapeInicial } from './componentes/RodapeInicial';
import { SEO } from './componentes/SEO';
import { ModalSobre } from './componentes/ModalSobre';
import { ModalContato } from './componentes/ModalContato';

// Seções Modularizadas
import { BackgroundHUD } from './componentes/BackgroundHUD';
import { SecaoHero } from './componentes/SecaoHero';
import { SecaoComoFunciona } from './componentes/SecaoComoFunciona';
import { SecaoRecursos } from './componentes/SecaoRecursos';
import { SecaoFAQ } from './componentes/SecaoFAQ';
import { SecaoCTAFinal } from './componentes/SecaoCTAFinal';

// Serviços
import { api } from '@/compartilhado/servicos/api';

/**
 * Página Inicial da Catraki.
 * Orquestra as seções da landing page e gerencia o estado global de tema e seleção de escola.
 */
export default function PaginaInicial() {
    const [temaEscuro, definirTemaEscuro] = useState(false);
    const [modalSobreAberto, definirModalSobreAberto] = useState(false);
    const [modalContatoAberto, definirModalContatoAberto] = useState(false);
    const [escolaSelecionada, definirEscolaSelecionada] = useState<string | null>(null);
    const Navegar = useNavigate();

    /**
     * Gerencia a seleção de uma escola no buscador.
     * Redireciona para o login se o método não for QRCODE, ou abre o portal de identificação.
     * @param slug - Identificador único da escola
     */
    const selecionarEscola = async (slug: string) => {
        try {
            const infoEscola = await api.obter<any>(`/publico/detalhes?slug=${slug}`);
            
            if (infoEscola) {
                // Redireciona imediatamente se não for QRCODE (fluxo administrativo padrão)
                if (infoEscola?.metodo_entrada !== 'QRCODE') {
                    return Navegar(`/${slug}/login`);
                }
                definirEscolaSelecionada(slug);
            } else {
                return Navegar(`/${slug}/login`);
            }
        } catch (erro) {
            console.error('[selecionarEscola]', erro);
            return Navegar(`/${slug}/login`);
        }
    };

    /**
     * Redireciona o usuário para o perfil escolhido dentro da escola selecionada.
     */
    const irParaPerfil = (perfil: 'aluno' | 'gestor') => {
        if (!escolaSelecionada) return;
        const rota = perfil === 'aluno' ? `/${escolaSelecionada}/aluno` : `/${escolaSelecionada}/login`;
        Navegar(rota);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-eletrico/30 overflow-x-hidden relative flex flex-col pt-safe-top transition-colors duration-500 ${temaEscuro ? 'bg-marinho text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
            <SEO
                titulo="Catraki — Controle de acesso escolar inteligente"
                descricao="O sistema que registra cada entrada e saída dos alunos, alerta sobre riscos de evasão e garante a segurança escolar."
            />

            <BackgroundHUD temaEscuro={temaEscuro} />

            <CabecalhoInicial
                temaEscuro={temaEscuro}
                aoAlternarTema={() => definirTemaEscuro(!temaEscuro)}
                aoAbrirModalSobre={() => definirModalSobreAberto(true)}
                aoAbrirModalContato={() => definirModalContatoAberto(true)}
            />

            <SecaoHero 
                temaEscuro={temaEscuro}
                escolaSelecionada={escolaSelecionada}
                aoSelecionarEscola={selecionarEscola}
                aoLimparEscola={() => definirEscolaSelecionada(null)}
                aoAbrirModalContato={() => definirModalContatoAberto(true)}
                aoIrParaPerfil={irParaPerfil}
            />

            <SecaoComoFunciona temaEscuro={temaEscuro} />

            <SecaoRecursos 
                temaEscuro={temaEscuro} 
                aoAbrirModalSobre={() => definirModalSobreAberto(true)} 
            />

            <SecaoFAQ temaEscuro={temaEscuro} />

            <SecaoCTAFinal 
                temaEscuro={temaEscuro} 
                aoAbrirModalContato={() => definirModalContatoAberto(true)} 
            />

            <RodapeInicial temaEscuro={temaEscuro} />

            {/* Modais Utilitários */}
            <ModalSobre
                aberto={modalSobreAberto}
                aoFechar={() => definirModalSobreAberto(false)}
                temaEscuro={temaEscuro}
                aoAbrirModalContato={() => definirModalContatoAberto(true)}
            />

            <ModalContato
                aberto={modalContatoAberto}
                aoFechar={() => definirModalContatoAberto(false)}
                temaEscuro={temaEscuro}
            />
        </div>
    );
}
