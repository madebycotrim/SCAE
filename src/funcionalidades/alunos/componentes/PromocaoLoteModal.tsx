import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@compartilhado/componentes/SelectComBusca';
import { CheckCircle, Users, ArrowRight } from 'lucide-react';
import { TurmaLocal } from '../types/aluno';

interface PromocaoLoteModalProps {
    quantidade: number;
    turmas: TurmaLocal[];
    aoFechar: () => void;
    aoPromover: (novaTurmaId: string) => Promise<void>;
}

export default function PromocaoLoteModal({ quantidade, turmas, aoFechar, aoPromover }: PromocaoLoteModalProps) {
    const [novaTurma, definirNovaTurma] = useState('');

    return (
        <ModalUniversal
            titulo="Enturmação em Lote"
            subtitulo={`Movimentação coletiva de ${quantidade} alunos para uma nova classe.`}
            aoFechar={aoFechar}
        >
            <div className="space-y-10">
                {/* Banner de Resumo Simplificado */}
                <div className="bg-gray-50 border border-gray-200 rounded p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded flex items-center justify-center shrink-0">
                            <Users size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MOVIMENTAÇÃO EM LOTE</p>
                            <h3 className="text-2xl font-bold text-gray-900 leading-none">
                                {quantidade} <span className="text-sm text-gray-600">Alunos Selecionados</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Seleção de Turma */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Nova Turma de Destino</label>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Obrigatório</span>
                    </div>
                    <SelectComBusca
                        label=""
                        options={turmas.map(t => ({ value: t.id, label: t.id }))}
                        value={novaTurma}
                        onChange={(valor) => definirNovaTurma(valor as string)}
                        placeholder="Selecione a turma de destino..."
                    />
                    <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Matrícula e histórico serão preservados.
                    </p>
                </div>

                {/* Footer Ações */}
                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 justify-end">
                    <button
                        onClick={aoFechar}
                        className="px-6 h-10 rounded border border-gray-300 text-gray-700 font-semibold text-xs tracking-wider uppercase hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => aoPromover(novaTurma)}
                        disabled={!novaTurma}
                        className="px-6 h-10 rounded bg-blue-600 text-white font-semibold text-xs tracking-wider uppercase hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle size={16} />
                        Confirmar
                    </button>
                </div>
            </div>
        </ModalUniversal>
    );
}
