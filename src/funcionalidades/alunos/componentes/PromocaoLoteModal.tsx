import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@compartilhado/componentes/SelectComBusca';
import { CheckCircle, Users, ArrowRight, GraduationCap } from 'lucide-react';
import { TurmaLocal } from '../types/aluno';
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
                {/* Banner de Resumo Master */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-xl">
                            <Users size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1.5">Batch Operation</p>
                            <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                                {quantidade} <span className="text-sm font-bold text-slate-500 ml-1 uppercase">Alunos em Fila</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Seleção de Turma de Destino */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <GraduationCap size={14} /> Nova Turma de Destino
                        </label>
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest leading-none">
                            Obrigatório
                        </span>
                    </div>

                    <SelectComBusca
                        options={turmas.map(t => ({ value: t.id, label: t.id }))}
                        value={novaTurma}
                        onChange={(valor) => definirNovaTurma(valor as string)}
                        placeholder="Selecione a turma para transferência..."
                        className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                    />

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                            <ArrowRight size={14} />
                        </div>
                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                            A movimentação é imediata. Matrículas e históricos individuais serão preservados e vinculados à nova classe.
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
