import { useState, useEffect } from 'react';
import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@/compartilhado/componentes/SelectComBusca';
import { CheckCircle, User, Hash, GraduationCap, Power, ShieldCheck, ArrowRight, ArrowLeft, Cake } from 'lucide-react';
import { Aluno, TurmaLocal } from '../tipos/academico';
import { Botao } from '@/compartilhado/componentes/UI';
import { usarEscola } from '@/escola/ProvedorEscola';
import toast from 'react-hot-toast';

interface FormAlunoModalProps {
    aluno?: Aluno | null;
    turmas: TurmaLocal[];
    aoFechar: () => void;
    aoSalvar: (dados: Partial<Aluno>) => Promise<void>;
}

export default function FormAlunoModal({ aluno, turmas, aoFechar, aoSalvar }: FormAlunoModalProps) {
    const escola = usarEscola();
    const temQR = escola.metodosAcesso.includes('QRCODE');
    
    const ehEdicao = !!aluno;
    const [passo, definirPasso] = useState(1);
    const [carregando, definirCarregando] = useState(false);
    const [dadosFormulario, definirDadosFormulario] = useState({
        nome_completo: '',
        matricula: '',
        turma_id: '',
        data_nascimento: '',
        ativo: true
    });

    useEffect(() => {
        if (aluno) {
            definirDadosFormulario({
                nome_completo: aluno.nome_completo,
                matricula: aluno.matricula,
                turma_id: aluno.turma_id,
                data_nascimento: aluno.data_nascimento || '',
                ativo: aluno.ativo ?? true
            });
        }
    }, [aluno]);

    const manipularSalvar = async () => {
        try {
            definirCarregando(true);
            await aoSalvar(dadosFormulario);
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <ModalUniversal
            titulo={aluno ? "Editar Aluno" : "Matricular Novo Aluno"}
            subtitulo={passo === 1 
                ? (aluno ? "Atualização de registro institucional" : "Preencha os dados básicos para iniciar o registro.") 
                : "Definição de credenciais de segurança para o aluno."}
            aoFechar={aoFechar}
            icone={aluno ? Edit2 : User}
            tamanho="lg"
        >
            <div className="space-y-6">
                {/* Stepper Visual (Apenas no Cadastro e se usar QR) */}
                {!ehEdicao && temQR && (
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${passo === 1 ? 'w-12 bg-slate-900' : 'w-4 bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${passo === 2 ? 'w-12 bg-slate-900' : 'w-4 bg-slate-200'}`}></div>
                    </div>
                )}

                {(ehEdicao || passo === 1) ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Seção 1: Dados Institucionais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div className="md:col-span-2 relative group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-slate-900">
                                    <User size={14} /> Nome Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400 placeholder:font-medium"
                                    value={dadosFormulario.nome_completo}
                                    onChange={(e) => definirDadosFormulario({ ...dadosFormulario, nome_completo: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                />
                            </div>

                            {/* Matrícula */}
                            <div className="relative">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    <Hash size={14} /> Matrícula
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all disabled:bg-slate-100 disabled:text-slate-500 placeholder:text-slate-400"
                                    value={dadosFormulario.matricula}
                                    onChange={(e) => definirDadosFormulario({ ...dadosFormulario, matricula: e.target.value })}
                                    disabled={ehEdicao}
                                    placeholder="Ex: 20240001"
                                />
                                <p className="mt-1.5 ml-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">ID único permanente</p>
                            </div>

                            {/* Turma Dropdown */}
                            <div className="relative">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    <GraduationCap size={14} /> Turma Designada
                                </label>
                                <SelectComBusca
                                    options={turmas.map(t => ({ value: t.id, label: t.id }))}
                                    value={dadosFormulario.turma_id}
                                    onChange={(valor) => definirDadosFormulario({ ...dadosFormulario, turma_id: valor as string })}
                                    placeholder="Selecione..."
                                    className={`w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${dadosFormulario.turma_id ? 'text-slate-800 border-slate-300' : 'text-slate-400'}`}
                                />
                            </div>

                            {/* Data de Nascimento (Aparece direto no Editar) */}
                            {ehEdicao && temQR && (
                                <div className="relative md:col-span-2 p-6 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-3 ml-1">
                                        <Cake size={14} /> Credencial de Segurança (Nascimento)
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full md:w-1/2 px-4 h-11 bg-white border border-indigo-100 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                        value={dadosFormulario.data_nascimento}
                                        onChange={(e) => definirDadosFormulario({ ...dadosFormulario, data_nascimento: e.target.value })}
                                    />
                                    <p className="mt-3 text-[9px] font-bold text-indigo-400 uppercase tracking-tight ml-1">
                                        Esta data é usada pelo aluno para acessar o QR Code.
                                    </p>
                                </div>
                            )}

                            {/* Status Toggle */}
                            {ehEdicao && (
                                <div className="md:col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                    <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                        <Power size={12} /> Situação da Matrícula
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: true })}
                                            className={`flex-1 h-10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${dadosFormulario.ativo
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-suave'
                                                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                                                }`}
                                        >
                                            Aluno Ativo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: false })}
                                            className={`flex-1 h-10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${!dadosFormulario.ativo
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-suave'
                                                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                                                }`}
                                        >
                                            Trancado / Inativo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        {/* Passo 2: Apenas no Cadastro Novo e se usar QR Code */}
                        {temQR && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
                                <div className="relative group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-indigo-600">
                                        <Cake size={14} /> Data de Nascimento
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                        value={dadosFormulario.data_nascimento}
                                        onChange={(e) => definirDadosFormulario({ ...dadosFormulario, data_nascimento: e.target.value })}
                                    />
                                    <p className="mt-2 ml-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Credencial de acesso do estudante</p>
                                </div>

                                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-4 items-center">
                                    <div className="p-3 bg-white rounded-2xl border border-indigo-100 shadow-sm flex-shrink-0">
                                        <ShieldCheck size={20} className="text-indigo-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Protocolo de Segurança</h4>
                                        <p className="text-[9px] font-bold text-indigo-700/80 leading-relaxed uppercase tracking-tight">
                                            Data necessária para o aluno validar a identidade e gerar o QR Code.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-4 pt-8 mt-4 border-t border-slate-100 justify-end">
                    {/* Botão de Fechar/Cancelar (Lado Esquerdo) */}
                    <Botao variante="secundario" tamanho="lg" onClick={aoFechar} disabled={carregando}>
                        Cancelar
                    </Botao>

                    {/* Botão de Voltar (Apenas se estiver no Passo 2) */}
                    {passo === 2 && !ehEdicao && temQR && (
                        <Botao variante="secundario" tamanho="lg" icone={ArrowLeft} onClick={() => definirPasso(1)} disabled={carregando}>
                            Anterior
                        </Botao>
                    )}

                    {/* Botão de Ação Principal (Seguir ou Salvar) */}
                    {(!ehEdicao && passo === 1 && temQR) ? (
                        <Botao 
                            variante="primario" 
                            tamanho="lg" 
                            icone={ArrowRight} 
                            disabled={!dadosFormulario.nome_completo || !dadosFormulario.matricula}
                            onClick={() => definirPasso(2)}
                        >
                            Segurança
                        </Botao>
                    ) : (
                        <Botao
                            variante="primario"
                            tamanho="lg"
                            icone={CheckCircle}
                            onClick={manipularSalvar}
                            carregando={carregando}
                            disabled={!dadosFormulario.nome_completo || !dadosFormulario.matricula}
                        >
                            {aluno ? 'Salvar Alterações' : 'Finalizar Matrícula'}
                        </Botao>
                    )}
                </div>
            </div>
        </ModalUniversal>
    );
}

const Edit2 = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </svg>
);

