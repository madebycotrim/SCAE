const http = require('http');

const payload1 = JSON.stringify({ login: 'admin', password: 'admin' });

const req1 = http.request({
  host: '192.168.1.34', port: 8080, path: '/login.fcgi', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload1) }
}, (res1) => {
  let body1 = '';
  res1.on('data', d => body1 += d);
  res1.on('end', () => {
    console.log("LOGIN BODY:", body1);
    try {
        const session = JSON.parse(body1).session;
        if (!session) return;
        // now try to load access logs
        const p2 = JSON.stringify({ object: 'access_logs' });
        const r2 = http.request({
        host: '192.168.1.34', port: 8080, path: '/load_objects.fcgi?session=' + session, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p2) }
        }, (res2) => {
            let b2 = ''; res2.on('data', d => b2+=d); res2.on('end', ()=>console.log('LOGS:', b2));
        });
        r2.write(p2); r2.end();
    } catch(e) {}
  });
});
req1.write(payload1); req1.end();
