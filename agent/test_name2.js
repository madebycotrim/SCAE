const fs = require('fs');
const http = require('http');

const payload1 = JSON.stringify({ login: 'admin', password: 'admin' });

const req1 = http.request({
  host: '192.168.1.34', port: 8080, path: '/login.fcgi', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload1) }
}, (res1) => {
  let body1 = ''; res1.on('data', d => body1 += d);
  res1.on('end', () => {
    try {
        const session = JSON.parse(body1).session;
        const p2 = JSON.stringify({ get_external_data: false, general: ["name"] });
        const r2 = http.request({
            host: '192.168.1.34', port: 8080, path: '/get_configuration.fcgi?session=' + session, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p2) }
        }, (res2) => {
            let b2 = ''; res2.on('data', d => b2+=d); 
            res2.on('end', () => {
                fs.writeFileSync('C:\\Users\\mateu\\Projetos\\SCAE\\agent\\out_name.txt', b2);
            });
        });
        r2.write(p2); r2.end();
    } catch(e) {}
  });
});
req1.write(payload1); req1.end();
