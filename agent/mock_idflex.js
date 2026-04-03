/**
 * mock_idflex.js
 * Servidor de mentira para simular o comportamento de um iDFlex na rede local.
 */

const http = require('http');

const PORT = 8080; // Vamos usar 8080 para evitar privilégios de admin
const TOKEN = "mock_session_12345";

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  let body = '';
  req.on('data', chunk => body += chunk);

  req.on('end', () => {
    console.log(`[MOCK] ${req.method} ${req.url}`);
    
    if (req.url === '/login.fcgi') {
        return res.end(JSON.stringify({ session: TOKEN }));
    }

    if (req.url === '/system_information.fcgi') {
        return res.end(JSON.stringify({ model: "iDFlex SCAE Emulator", serial_number: "SCAE-MOCK-001" }));
    }

    if (req.url === '/load_objects.fcgi') {
        return res.end(JSON.stringify({ count: 42 }));
    }

    if (req.url === '/load_logs.fcgi') {
        return res.end(JSON.stringify({ 
            logs: [
                { id: 1, user_id: 159, time: Math.floor(Date.now() / 1000) - 10, event: 7 },
                { id: 2, user_id: 202, time: Math.floor(Date.now() / 1000) - 5, event: 7 }
            ] 
        }));
    }

    if (req.url.includes('set_db.fcgi') || req.url.includes('execute_actions.fcgi')) {
        return res.end(JSON.stringify({ status: "ok" }));
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Endpoint not mocked" }));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Simulador iDFlex rodando em http://localhost:${PORT}`);
  console.log(`Altere seu .env ou config.ts para IP: 127.0.0.1 e Porta: ${PORT} para testar.`);
});
