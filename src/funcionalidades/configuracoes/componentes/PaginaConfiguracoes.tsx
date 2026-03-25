import { useState } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { ShieldAlert, WifiOff, Wifi } from 'lucide-react';
import { usarEscola } from '@/escola/ProvedorEscola';
import toast from 'react-hot-toast';

export function PaginaConfiguracoes() {
    // const {} = usarEscola();
    const [protocolo, definirProtocolo] = useState<'ESTATICO' | 'DINAMICO'>('ESTATICO');
    const [salvando, definirSalvando] = useState(false);

    const salvarConfiguracoes = async () => {
        try {
            definirSalvando(true);
            // Simulação de chamada de API: await api.atualizar('/escola/configuracoes', { protocolo });
            await new Promise(r => setTimeout(r, 800));
            toast.success('Configurações do sistema atualizadas!');
        } catch (e) {
            toast.error('Erro ao salvar configurações.');
        } finally {
            definirSalvando(false);
        }
    };

    return (
        <LayoutAdministrativo
            titulo="Configurações"
            subtitulo="Ajustes globais do sistema de controle de acesso para sua unidade"
            acoes={
                <Botao variante="primario" tamanho="lg" onClick={salvarConfiguracoes} loading={salvando}>
                    Salvar Alterações
                </Botao>
            }
        >
            <div className="space-y-6 max-w-5xl">

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    {/* Left Info Section */}
                    <div className="flex gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldAlert strokeWidth={2.5} size={24} />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                    Protocolo de Validação
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200/60 leading-none h-4">
                                    Funcionamento Offline
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                O código permanece o mesmo. Ideal para locais onde o aluno possui pouco sinal de internet.
                            </p>
                        </div>
                    </div>

                    {/* Right Toggle Section */}
                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button
                            onClick={() => definirProtocolo('ESTATICO')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${protocolo === 'ESTATICO'
                                ? 'bg-white text-indigo-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <WifiOff size={14} className={protocolo === 'ESTATICO' ? 'text-indigo-500' : 'text-slate-400'} strokeWidth={2.5} />
                            QR Estático
                        </button>
                        <button
                            onClick={() => definirProtocolo('DINAMICO')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${protocolo === 'DINAMICO'
                                ? 'bg-white text-indigo-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <Wifi size={14} className={protocolo === 'DINAMICO' ? 'text-indigo-500' : 'text-slate-400'} strokeWidth={2.5} />
                            QR Dinâmico
                        </button>
                    </div>
                </CartaoConteudo>

            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoes;
