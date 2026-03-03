const fs = require('fs');
let code = fs.readFileSync('src/principal/PaginaInicial.tsx', 'utf8');

// Basic bracket counting to find if we need another `}`
let openBraces = (code.match(/\{/g) || []).length;
let closeBraces = (code.match(/\}/g) || []).length;

if (openBraces > closeBraces) {
    code = code.replace(/export default PaginaInicial;/, '}\n\nexport default PaginaInicial;');
    fs.writeFileSync('src/principal/PaginaInicial.tsx', code);
    console.log("Added missing brace.");
} else {
    console.log("Braces balanced. Checking tags...");
}
