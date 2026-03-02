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
                    <div className="flex p-1 bg-gray-100 rounded border border-gray-200">
                        <button
                            onClick={() => definirAbaAtiva('arquivo')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-semibold transition-colors ${abaAtiva === 'arquivo' ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FileSpreadsheet size={16} />
                            Arquivo Excel
                        </button>
                        <button
                            onClick={() => definirAbaAtiva('colar')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-semibold transition-colors ${abaAtiva === 'colar' ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Clipboard size={16} />
                            Colagem Rápida
                        </button>
                    </div>

                    {abaAtiva === 'arquivo' ? (
                        <div className="space-y-4">
                            <div className="relative group overflow-hidden border border-dashed border-gray-300 rounded p-8 text-center hover:border-blue-500 hover:bg-gray-50 transition-colors cursor-pointer bg-white">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={processarArquivo}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    disabled={importando}
                                />
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 border border-blue-100 rounded flex items-center justify-center mb-3">
                                        <Upload size={20} />
                                    </div>
                                    <h4 className="font-semibold text-gray-800 text-sm">Arraste ou Clique para fazer upload</h4>
                                    <p className="text-xs text-gray-500 mt-1">Suporta .xlsx, .xls e .csv</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded p-4 border border-gray-200 flex items-start gap-3">
                                <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Dica de Formatação</p>
                                    <p className="text-sm text-gray-600">
                                        O arquivo deve conter as colunas <span className="font-bold text-gray-900">NOME</span>, <span className="font-bold text-gray-900">MATRICULA</span> e <span className="font-bold text-gray-900">TURMA</span>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    className="w-full h-48 p-4 bg-white border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder:text-gray-400 resize-none font-mono"
                                    placeholder="Dica: Selecione os dados no Excel, copie e cole aqui..."
                                    value={textoColado}
                                    onChange={(e) => definirTextoColado(e.target.value)}
                                />
                                <div className="absolute right-3 bottom-3 text-xs font-semibold text-gray-400 pointer-events-none">
                                    {textoColado.length > 0 ? `${textoColado.split('\n').length} linhas` : ''}
                                </div>
                            </div>

                            <button
                                onClick={processarColagem}
                                disabled={importando || !textoColado.trim()}
                                className="w-full h-10 bg-blue-600 text-white rounded font-semibold text-sm uppercase tracking-wider hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-gray-400"
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
