import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { FileSpreadsheet, Clipboard, Upload, CheckCircle, XCircle, Info, ChevronRight } from 'lucide-react';
import { read, utils } from 'xlsx';
import toast from 'react-hot-toast';
import { ResultadoImportacao } from '../types/aluno';

interface ImportacaoAlunosModalProps {
    aoFechar: () => void;
    onImport: (dados: any[]) => Promise<ResultadoImportacao>;
}

export default function ImportacaoAlunosModal({ aoFechar, onImport }: ImportacaoAlunosModalProps) {
    const [abaAtiva, definirAbaAtiva] = useState<'arquivo' | 'colar'>('arquivo');
    const [importando, definirImportando] = useState(false);
    const [resultado, definirResultado] = useState<ResultadoImportacao | null>(null);
    const [textoColado, definirTextoColado] = useState('');

    const processarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        definirImportando(true);
        try {
            const data = await arquivo.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json(worksheet);

            const res = await onImport(jsonData);
            definirResultado(res);
        } catch (erro) {
            toast.error("Falha ao processar arquivo.");
        } finally {
            definirImportando(false);
        }
    };

    const processarColagem = async () => {
        if (!textoColado.trim()) {
            toast.error("Cole os dados primeiro.");
            return;
        }

        definirImportando(true);
        try {
            const linhas = textoColado.trim().split('\n');
            const data = linhas.map(linha => linha.split('\t'));

            if (data.length > 0) {
                const primeiraLinha = (data[0][0] || '').toLowerCase();
                if (primeiraLinha.includes('nome') || primeiraLinha.includes('matricula')) {
                    data.shift();
                }
            }

            const res = await onImport(data);
            definirResultado(res);
        } catch (erro) {
            toast.error("Falha ao processar texto colado.");
        } finally {
            definirImportando(false);
        }
    };

    return (
        <ModalUniversal
            titulo="Importação de Alunos"
            subtitulo="Adicione múltiplos registros simultaneamente via arquivo ou colagem."
            aoFechar={aoFechar}
        >
            {!resultado ? (
                <div className="space-y-6">
                    {/* Seletor de Método (Abas) Discreto */}
                    <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                            onClick={() => definirAbaAtiva('arquivo')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${abaAtiva === 'arquivo' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileSpreadsheet size={16} />
                            Arquivo Excel
                        </button>
                        <button
                            onClick={() => definirAbaAtiva('colar')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${abaAtiva === 'colar' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Clipboard size={16} />
                            Colagem Rápida
                        </button>
                    </div>

                    {abaAtiva === 'arquivo' ? (
                        <div className="space-y-4">
                            <div className="relative group overflow-hidden border-2 border-dashed border-slate-300 rounded-lg p-10 text-center hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={processarArquivo}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    disabled={importando}
                                />
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Upload size={24} />
                                    </div>
                                    <h4 className="font-semibold text-slate-800 text-base">Arraste ou Clique para fazer upload</h4>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Suporta .xlsx, .xls e .csv</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-start gap-3">
                                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-blue-900 mb-1">Dica de Formatação</p>
                                    <p className="text-sm text-blue-800">
                                        O arquivo deve conter as colunas <span className="font-bold">NOME</span>, <span className="font-bold">MATRICULA</span> e <span className="font-bold">TURMA</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    className="w-full h-48 p-4 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 resize-none font-mono shadow-sm"
                                    placeholder="Dica: Selecione os dados no Excel, copie e cole aqui diretamente..."
                                    value={textoColado}
                                    onChange={(e) => definirTextoColado(e.target.value)}
                                />
                                <div className="absolute right-3 bottom-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                    {textoColado.length > 0 ? `${textoColado.split('\n').length} linhas` : ''}
                                </div>
                            </div>

                            <button
                                onClick={processarColagem}
                                disabled={importando || !textoColado.trim()}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm"
                            >
                                {importando ? 'Processando registros...' : 'Processar Agora'}
                                {!importando && <ChevronRight size={16} />}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-4 animate-in zoom-in-95 duration-300">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Importação Finalizada</h3>
                        <p className="text-sm text-slate-500">O processamento dos registros foi concluído.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-center">
                            <p className="text-emerald-700 font-bold text-3xl mb-1">{resultado.sucessos}</p>
                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Sucessos</p>
                        </div>

                        <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 text-center">
                            <p className="text-rose-700 font-bold text-3xl mb-1">{resultado.erros}</p>
                            <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Falhas</p>
                        </div>
                    </div>

                    <button
                        onClick={aoFechar}
                        className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors flex items-center justify-center border border-slate-200"
                    >
                        Fechar e Continuar
                    </button>
                </div>
            )}
        </ModalUniversal>
    );
}
