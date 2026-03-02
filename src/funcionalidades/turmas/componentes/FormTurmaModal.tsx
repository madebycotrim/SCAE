import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { BookOpen, Users, GraduationCap, ChevronRight } from 'lucide-react';

interface FormTurmaModalProps {
    turma?: any | null; // Tipagem simplificada conforme o arquivo original
    aoFechar: () => void;
    aoSalvar: (dados: any) => Promise<void>;
}

export default function FormTurmaModal({ turma, aoFechar, aoSalvar }: FormTurmaModalProps) {
    const [etapa, definirEtapa] = useState(1);
    const [serieTurma, definirSerieTurma] = useState('');
    const [letraTurma, definirLetraTurma] = useState('');
    const [turno, definirTurno] = useState('Matutino');
    const [anoLetivo, definirAnoLetivo] = useState(new Date().getFullYear().toString());
    const [lotacaoMaxima, definirLotacaoMaxima] = useState('40');
    const [professorRegente, definirProfessorRegente] = useState('');
    const [sala, definirSala] = useState('');

    useEffect(() => {
        if (turma) {
            definirSerieTurma(turma.serie);
            definirLetraTurma(turma.letra);
            definirTurno(turma.turno);
            definirAnoLetivo(turma.ano_letivo.toString());
            definirLotacaoMaxima(turma.lotacao_maxima?.toString() || '40');
            definirProfessorRegente(turma.professor_regente || '');
            definirSala(turma.sala || '');
        }
    }, [turma]);

    const podeAvancar = serieTurma !== '' && letraTurma !== '';

    const manipularSalvar = async () => {
        await aoSalvar({
            serie: serieTurma,
            letra: letraTurma,
            turno,
            ano_letivo: parseInt(anoLetivo),
            lotacao_maxima: parseInt(lotacaoMaxima) || 40,
            professor_regente: professorRegente,
            sala
        });
    };

    return (
        <ModalUniversal
            titulo={turma ? "Editar Turma" : "Nova Turma"}
            subtitulo={etapa === 1 ? "Identidade e Turno da Classe" : "Parâmetros de Gestão e Localização"}
            aoFechar={aoFechar}
        >
            <div className="flex flex-col h-full min-h-[460px]">
                {/* Indicador de Etapa - Contraste Reforçado */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`h-2 rounded transition-colors duration-200 ${etapa === 1 ? 'w-12 bg-blue-600' : 'w-4 bg-gray-200'}`}></div>
                    <div className={`h-2 rounded transition-colors duration-200 ${etapa === 2 ? 'w-12 bg-blue-600' : 'w-4 bg-gray-200'}`}></div>
                </div>

                <div className="flex-1 overflow-y-auto px-1">
                    {etapa === 1 ? (
                        <div className="space-y-6">
                            {/* Série */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">1. Selecione a Série (Obrigatório)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['1', '2', '3'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={!!turma}
                                            onClick={() => definirSerieTurma(s)}
                                            className={`h-14 rounded text-lg font-semibold transition-colors border ${serieTurma === s
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100'
                                                }`}
                                        >
                                            {s}º Ano
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Letra */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">2. Identificação / Letra (Obrigatório)</label>
                                <div className="flex flex-wrap gap-3">
                                    {['A', 'B', 'C', 'D', 'E'].map((l) => (
                                        <button
                                            key={l}
                                            type="button"
                                            disabled={!!turma}
                                            onClick={() => definirLetraTurma(l)}
                                            className={`w-14 h-14 rounded text-xl font-semibold transition-colors border ${letraTurma === l
                                                ? 'bg-gray-900 border-gray-900 text-white'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100'
                                                }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Turno */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">3. Horário de Aula</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {['Matutino', 'Vespertino', 'Noturno', 'Integral'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => definirTurno(t)}
                                            className={`h-10 rounded text-xs font-semibold uppercase tracking-wider border transition-colors ${turno === t
                                                ? 'bg-gray-900 border-gray-900 text-white'
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Ano Letivo</label>
                                    <div className="relative border border-gray-300 rounded focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white flex items-center overflow-hidden">
                                        <div className="pl-3 pr-2 text-gray-500">
                                            <Users size={16} />
                                        </div>
                                        <input
                                            type="number"
                                            value={anoLetivo}
                                            onChange={(e) => definirAnoLetivo(e.target.value)}
                                            className="w-full h-10 bg-transparent text-sm font-medium text-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                            disabled={!!turma}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex justify-between">
                                        <span>Capacidade de Alunos</span>
                                        <span className="text-blue-700 font-bold">{lotacaoMaxima}</span>
                                    </label>
                                    <div className="pt-2 px-1">
                                        <input
                                            type="range" min="1" max="60"
                                            value={lotacaoMaxima}
                                            onChange={(e) => definirLotacaoMaxima(e.target.value)}
                                            className="w-full accent-blue-600 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-200 space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Professor Regente</label>
                                    <div className="relative border border-gray-300 rounded focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white flex items-center overflow-hidden">
                                        <div className="pl-3 pr-2 text-gray-500">
                                            <GraduationCap size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={professorRegente}
                                            onChange={(e) => definirProfessorRegente(e.target.value)}
                                            placeholder="Nome do professor responsável"
                                            className="w-full h-10 bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Lugar de Aula / Sala</label>
                                    <div className="relative border border-gray-300 rounded focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white flex items-center overflow-hidden">
                                        <div className="pl-3 pr-2 text-gray-500">
                                            <BookOpen size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={sala}
                                            onChange={(e) => definirSala(e.target.value)}
                                            placeholder="Ex: Bloco B - Sala 12"
                                            className="w-full h-10 bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navegação */}
                <div className="flex gap-3 pt-6 mt-4 border-t border-gray-200 justify-end">
                    {etapa === 2 && (
                        <button
                            type="button"
                            onClick={() => definirEtapa(1)}
                            className="px-6 h-10 rounded border border-gray-300 text-gray-700 font-semibold text-xs tracking-wider hover:bg-gray-50 transition-colors flex items-center"
                        >
                            Voltar
                        </button>
                    )}

                    {etapa === 1 ? (
                        <button
                            type="button"
                            onClick={() => definirEtapa(2)}
                            disabled={!podeAvancar}
                            className="px-6 h-10 rounded bg-blue-600 text-white font-semibold text-xs tracking-wider hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                        >
                            Próximo Passo
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={manipularSalvar}
                            className="px-6 h-10 rounded bg-blue-600 text-white font-semibold text-xs tracking-wider hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <CheckCircleIcon size={16} />
                            Concluir
                        </button>
                    )}
                </div>
            </div>
        </ModalUniversal>
    );
}

// Ícones simplificados para evitar problemas de importação no componente
const CheckCircleIcon = ({ size, strokeWidth = 2, className }: { size: number, strokeWidth?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
