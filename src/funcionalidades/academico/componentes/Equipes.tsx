import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    Calendar,
    ArrowRight,
    Layers,
    Hexagon,
    Settings2,
    Clock,
    UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import { usarEscola } from '@/escola/ProvedorEscola';
import { servicoEquipe } from '../servicos/equipe.servico';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';
import FormEquipeModal from './FormEquipeModal';

const log = criarRegistrador('Equipes');

export default function Equipes() {
    const navegar = useNavigate();
    const { podeAcessar } = usarPermissoes();
    const escola = usarEscola();
    const [searchParams] = useSearchParams();

    const { dados, carregando, carregandoInicial, recarregar: carregarEquipes } = usarConsulta(
        ['equipes'],
        () => servicoEquipe.listarEquipes()
    );

    const equipes = dados || [];
    const [termoBusca, definirTermoBusca] = useState('');
    const [equipeParaExcluir, definirEquipeParaExcluir] = useState<string | null>(null);
    const [modalAberto, definirModalAberto] = useState(false);
    const [equipeEmEdicao, definirEquipeEmEdicao] = useState<any>(null);

    const equipesFiltradas = useMemo(() => {
        return equipes.filter((e: any) => 
            e.nome_equipe.toLowerCase().includes(termoBusca.toLowerCase()) ||
            e.id.toLowerCase().includes(termoBusca.toLowerCase())
        );
    }, [equipes, termoBusca]);

    const confirmarExclusao = async () => {
        if (!equipeParaExcluir) return;
        try {
            await servicoEquipe.removerEquipe(equipeParaExcluir);
            toast.success('Equipe removida com sucesso');
            carregarEquipes();
        } catch (erro) {
            log.error('Erro ao excluir', erro);
            toast.error('Não foi possível excluir a equipe.');
        } finally {
            definirEquipeParaExcluir(null);
        }
    };

    const salvarEquipe = async (dados: any) => {
        try {
            await servicoEquipe.salvarEquipe(dados);
            toast.success(equipeEmEdicao ? 'Equipe atualizada' : 'Equipe criada com sucesso');
            definirModalAberto(false);
            carregarEquipes();
        } catch (erro) {
            log.error('Erro ao salvar', erro);
            toast.error('Não foi possível salvar os dados da equipe.');
        }
    };

    const abrirEdicao = (equipe: any) => {
        definirEquipeEmEdicao(equipe);
        definirModalAberto(true);
    };

    const abrirNovo = () => {
        definirEquipeEmEdicao(null);
        definirModalAberto(true);
    };

    if (!podeAcessar('academico', 'visualizar')) {
        return (
            <LayoutAdministrativo titulo="Equipes" subtitulo="" acoes={null}>
                <div className="flex flex-col items-center justify-center h-96 gap-4 text-slate-400 opacity-50 grayscale">
                    <Layers size={64} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-[11px]">Acesso Restrito</p>
                </div>
            </LayoutAdministrativo>
        );
    }

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="sm"
            icone={Plus}
            onClick={abrirNovo}
        >
            Nova Equipe
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Gestão de Equipes"
            subtitulo="Organize alunos em grupos com escalas de presença personalizadas"
            acoes={AcoesHeader}
            carregando={carregando}
        >
            <BarraFiltro className="bg-white border-slate-200 shadow-suave p-3 rounded-2xl">
                <div className="flex flex-col gap-2 flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 leading-none">Buscar Equipe</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome da equipe ou identificador..."
                        value={termoBusca}
                        onChange={(e) => definirTermoBusca(e.target.value)}
                        className="w-full h-11 border-none shadow-none bg-slate-50/50"
                    />
                </div>
            </BarraFiltro>

            <CartaoConteudo className="mt-8 border-none bg-transparent shadow-none p-0">
                {carregandoInicial ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
                                <Esqueleto className="w-12 h-12 rounded-2xl mb-4" />
                                <Esqueleto className="w-3/4 h-6 mb-2" />
                                <Esqueleto className="w-1/2 h-4 mb-6" />
                                <div className="flex gap-2">
                                    <Esqueleto className="w-1/3 h-8 rounded-xl" />
                                    <Esqueleto className="w-1/3 h-8 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : equipesFiltradas.length === 0 ? (
                    <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100/50 border border-white">
                            <Layers size={40} className="text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Sem equipes configuradas</h3>
                        <p className="text-[11px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest text-center leading-relaxed">
                            Crie sua primeira equipe para começar a gerenciar escalas alternadas de alunos.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {equipesFiltradas.map((equipe: any) => (
                            <div
                                key={equipe.id}
                                className="group relative bg-white border border-slate-100 rounded-[40px] p-8 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                                onClick={() => navegar(`/${escola.id}/admin/equipes/${equipe.id}`)}
                            >
                                {/* Moldura de Cor Lateral */}
                                <div 
                                    className="absolute top-0 left-0 w-2 h-full transition-all duration-500 group-hover:w-4" 
                                    style={{ backgroundColor: equipe.cor || '#4F46E5' }}
                                />

                                <div className="flex items-start justify-between mb-8">
                                    <div 
                                        className="w-14 h-14 rounded-3xl flex items-center justify-center border transition-all duration-500 shadow-lg group-hover:scale-110"
                                        style={{ 
                                            backgroundColor: `${equipe.cor}10`, 
                                            borderColor: `${equipe.cor}40`,
                                            color: equipe.cor || '#4F46E5'
                                        }}
                                    >
                                        <Hexagon size={28} strokeWidth={2.5} />
                                    </div>

                                    <div className="flex gap-2 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); abrirEdicao(equipe); }}
                                            className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); definirEquipeParaExcluir(equipe.id); }}
                                            className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-8">
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter line-clamp-1">{equipe.nome_equipe}</h4>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span className="px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">{equipe.id}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 border border-slate-100">
                                        <span className="text-lg font-black text-slate-800">{equipe.totalGrupos || 0}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Grupos</span>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 border border-slate-100">
                                        <span className="text-lg font-black text-slate-800">{equipe.totalAlunos || 0}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Alunos</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: equipe.cor || '#4F46E5' }}></div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status: Ativa</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:gap-3 transition-all">
                                        Gerenciar <ArrowRight size={14} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CartaoConteudo>

            {equipeParaExcluir && (
                <ModalConfirmacao
                    titulo="Excluir Equipe"
                    mensagem={`Deseja remover a equipe "${equipeParaExcluir}"? Todos os grupos e vínculos de alunos serão afetados.`}
                    textoConfirmar="Sim, Excluir Equipe"
                    aoConfirmar={confirmarExclusao}
                    aoCancelar={() => definirEquipeParaExcluir(null)}
                    variante="perigoso"
                />
            )}

            {modalAberto && (
                <FormEquipeModal
                    equipe={equipeEmEdicao}
                    aoFechar={() => definirModalAberto(false)}
                    aoSalvar={salvarEquipe}
                />
            )}
        </LayoutAdministrativo>
    );
}
