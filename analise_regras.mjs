import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');
const funcionalidadesDir = path.join(srcDir, 'funcionalidades');

const report = {
    largeFiles: [],
    crossFeatureImports: [],
    potentialPiiLogs: [],
    axiosDirectImports: [],
    firebaseDirectImports: [],
};

function walkSync(currentDirPath, callback) {
    if (!fs.existsSync(currentDirPath)) return;
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // 1. Check file size > 300
    if (lines.length > 300) {
        report.largeFiles.push({ file: path.relative(process.cwd(), filePath), lines: lines.length });
    }

    // 2. Check Axios direct imports
    if (!filePath.includes('api.ts') && content.includes('import axios') || content.includes('from \'axios\'') || content.includes('from "axios"')) {
        report.axiosDirectImports.push(path.relative(process.cwd(), filePath));
    }

    // 3. Check Firebase direct imports
    if (!filePath.includes('firebase.config.ts') && (content.includes('from \'firebase/') || content.includes('from "firebase/'))) {
        report.firebaseDirectImports.push(path.relative(process.cwd(), filePath));
    }

    // 4. Check console.log (just collect to analyze context later, ignore simple usages if possible or just flag all)
    const logMatches = [...content.matchAll(/console\.log\((.*)\)/g)];
    for (const match of logMatches) {
        const rawArgs = match[1];
        if (rawArgs.toLowerCase().includes('aluno') || rawArgs.toLowerCase().includes('nome') || rawArgs.toLowerCase().includes('cpf') || rawArgs.toLowerCase().includes('email') || rawArgs.toLowerCase().includes('matricula')) {
            report.potentialPiiLogs.push({ file: path.relative(process.cwd(), filePath), log: match[0] });
        }
    }

    // 5. Check cross-feature imports
    // If file is inside src/funcionalidades/FEATURE_A, check if it imports from FEATURE_B
    if (filePath.startsWith(funcionalidadesDir)) {
        const relativePath = path.relative(funcionalidadesDir, filePath);
        const featureName = relativePath.split(path.sep)[0];

        // We look for imports containing '../' or '@/funcionalidades/'
        // Regex for import from string
        const importRegex = /from\s+['"](.*)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('@/funcionalidades/') || importPath.startsWith('../../')) {
                // Resolve absolute path of import
                let resolvedImportPath = '';
                if (importPath.startsWith('@/funcionalidades/')) {
                    resolvedImportPath = path.join(funcionalidadesDir, importPath.replace('@/funcionalidades/', ''));
                } else {
                    resolvedImportPath = path.resolve(path.dirname(filePath), importPath);
                }

                if (resolvedImportPath.startsWith(funcionalidadesDir)) {
                    const importedFeature = path.relative(funcionalidadesDir, resolvedImportPath).split(path.sep)[0];
                    if (importedFeature !== featureName) {
                        report.crossFeatureImports.push({ file: path.relative(process.cwd(), filePath), import: importPath, targetFeature: importedFeature });
                    }
                }
            }
        }
    }
}

walkSync(srcDir, processFile);
fs.writeFileSync('analysis_temp.json', JSON.stringify(report, null, 2));
console.log('Analysis complete. Results in analysis_temp.json');
