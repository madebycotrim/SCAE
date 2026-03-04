import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@compartilhado/componentes/SelectComBusca';
import { CheckCircle, Users, ArrowRight, GraduationCap } from 'lucide-react';
import { TurmaLocal } from '../tipos/academico';
import { Botao } from '@compartilhado/componentes/UI';

interface PromocaoLoteModalProps {
    quantidade: number;
    turmas: TurmaLocal[];
    aoFechar: () => void;
    aoPromover: (novaTurmaId: string) => Promise<void>;
}

export default function PromocaoLoteModal({ quantidade, turmas, aoFechar, aoPromover }: PromocaoLoteModalProps) {
    const [novaTurma, definirNovaTurma] = useState('');
    const [carregando, definirCarregando] = useState(false);

    const manipularPromover = async () => {
        try {
            definirCarregando(true);
            await aoPromover(novaTurma);
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <ModalUniversal
            titulo="Enturmação em Lote"
            subtitulo={`Processamento coletivo de registros acadêmicos.`}
            icone={Users}
            aoFechar={aoFechar}
            tamanho="md"
        >
            <div className="space-y-8 pb-4">
                {/* Banner de Resumo Sóbrio V2 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                            <Users size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Operação em Lote</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter leading-none">
                                {quantidade} <span className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Alunos selecionados</span>
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <GraduationCap size={14} /> Nova Turma de Destino
                        </label>
                        <span className="text-[8px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                            Obrigatório
                        </span>
                    </div>

                    <SelectComBusca
                        options={turmas.map(t => ({ value: t.id, label: t.id }))}
                        value={novaTurma}
                        onChange={(valor) => definirNovaTurma(valor as string)}
                        placeholder="Selecione a turma..."
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                    />

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                        <div className="p-1.5 bg-slate-100 rounded text-slate-400 shrink-0">
                            <ArrowRight size={12} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 leading-normal uppercase tracking-tight">
                            A movimentação é processada instantaneamente. Os históricos individuais serão preservados na nova classe.
                        </p>
                    </div>
                </div>

                {/* Footer Ações */}
                <div className="flex gap-4 pt-8 mt-4 border-t border-slate-100 justify-end">
                    <Botao
                        variante="secundario"
                        tamanho="lg"
                        onClick={aoFechar}
                        disabled={carregando}
                    >
                        Cancelar
                    </Botao>
                    <Botao
                        variante="primario"
                        tamanho="lg"
                        icone={CheckCircle}
                        onClick={manipularPromover}
                        disabled={!novaTurma}
                        loading={carregando}
                    >
                        Confirmar Movimentação
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}
