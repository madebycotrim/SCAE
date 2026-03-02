import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@compartilhado/componentes/SelectComBusca';
import { CheckCircle } from 'lucide-react';
import { Aluno, TurmaLocal } from '../types/aluno';

interface FormAlunoModalProps {
    aluno?: Aluno | null;
    turmas: TurmaLocal[];
    aoFechar: () => void;
    aoSalvar: (dados: Partial<Aluno>) => Promise<void>;
}

export default function FormAlunoModal({ aluno, turmas, aoFechar, aoSalvar }: FormAlunoModalProps) {
    const ehEdicao = !!aluno;
    const [dadosFormulario, definirDadosFormulario] = useState({
        nome_completo: '',
        matricula: '',
        turma_id: '',
        ativo: true
    });

    useEffect(() => {
        if (aluno) {
            definirDadosFormulario({
                nome_completo: aluno.nome_completo,
                matricula: aluno.matricula,
                turma_id: aluno.turma_id,
                ativo: aluno.ativo ?? true
            });
        }
    }, [aluno]);

    const manipularSalvar = async () => {
        await aoSalvar(dadosFormulario);
    };

    return (
        <ModalUniversal
            titulo={aluno ? "Editar Aluno" : "Adicionar Aluno"}
            subtitulo={aluno ? `Editando dados do aluno ${aluno.nome_completo}` : "Preencha os dados abaixo para cadastrá-lo em uma das turmas."}
            aoFechar={aoFechar}
        >
            <div className="space-y-6 min-h-[400px]">
                {/* Nome Completo - Foco em Legibilidade */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Nome Completo do Aluno</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 h-10 bg-white border border-gray-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder:text-gray-400"
                        value={dadosFormulario.nome_completo}
                        onChange={(e) => definirDadosFormulario({ ...dadosFormulario, nome_completo: e.target.value })}
                        placeholder="Ex: Mateus Felipe Cotrim"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Matrícula */}
                    <div className="relative pb-6">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Nº de Matrícula</label>
                        <input
                            type="text"
                            className="w-full px-3 h-10 bg-white border border-gray-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                            value={dadosFormulario.matricula}
                            onChange={(e) => definirDadosFormulario({ ...dadosFormulario, matricula: e.target.value })}
                            disabled={!!aluno}
                            placeholder="Ex: 20240001"
                        />
                        <p className="absolute bottom-0 left-0 text-xs text-gray-500">Identificador imutável</p>
                    </div>

                    {/* Turma Dropdown */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Turma Designada</label>
                        <div className="relative">
                            <SelectComBusca
                                options={turmas.map(t => ({ value: t.id, label: t.id }))}
                                value={dadosFormulario.turma_id}
                                onChange={(valor) => definirDadosFormulario({ ...dadosFormulario, turma_id: valor as string })}
                                placeholder="Selecione a turma..."
                            />
                        </div>
                    </div>

                    {/* Status Toggle */}
                    {ehEdicao && (
                        <div className="md:col-span-2 p-4 bg-gray-50 rounded border border-gray-200">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dadosFormulario.ativo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                Status da Matrícula Atual
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: true })}
                                    className={`flex-1 h-10 rounded text-xs font-semibold uppercase tracking-wider transition-colors border ${dadosFormulario.ativo
                                        ? 'bg-green-600 border-green-700 text-white'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Aluno Ativo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: false })}
                                    className={`flex-1 h-10 rounded text-xs font-semibold uppercase tracking-wider transition-colors border ${!dadosFormulario.ativo
                                        ? 'bg-red-600 border-red-700 text-white'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Matrícula Trancada
                                </button>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 flex items-start gap-1">
                                <span className="text-gray-700 mt-0.5">ℹ</span>
                                <span>Alunos inativos são preservados no histórico acadêmico.</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 justify-end">
                    <button
                        onClick={aoFechar}
                        className="px-6 h-10 rounded border border-gray-300 text-gray-700 font-semibold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={manipularSalvar}
                        className="px-6 h-10 rounded bg-blue-600 text-white font-semibold text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors flex items-center gap-2 group"
                    >
                        <CheckCircle size={16} />
                        {aluno ? 'Salvar Dados' : 'Concluir'}
                    </button>
                </div>
            </div>
        </ModalUniversal>
    );
}
