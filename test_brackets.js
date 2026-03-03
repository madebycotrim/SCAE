const fs = require('fs');
const code = fs.readFileSync('src/principal/PaginaInicial.tsx', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '{' || char === '(' || char === '<') {
        stack.push({ char, index: i, line: code.slice(0, i).split('\n').length });
    } else if (char === '}' || char === ')' || char === '>') {
        if (stack.length === 0) {
            console.log(`Unmatched closing ${char} at line ${code.slice(0, i).split('\n').length}`);
            break;
        }

        const last = stack.pop();
        if ((char === '}' && last.char !== '{') ||
            (char === ')' && last.char !== '(') ||
            (char === '>' && last.char !== '<')) {
            // Ignore <> mismatches as they are common in JSX tags, just warn on {} and ()
            if (char !== '>') {
                console.log(`Mismatched closing ${char} at line ${code.slice(0, i).split('\n').length}. Expected to close ${last.char} from line ${last.line}`);
            }
        }
    }
}

if (stack.length > 0) {
    const openTags = stack.filter(s => s.char === '{' || s.char === '(').map(s => `Line ${s.line}: ${s.char}`);
    console.log("Unmatched opening tags:");
    console.log(openTags.slice(-10).join('\n'));
} else {
    console.log("Brackets matched.");
}
