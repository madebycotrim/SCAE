const http = require('http');

const req = http.request({
  host: '192.168.1.34',
  port: 80,
  path: '/system_information.fcgi',
  method: 'POST'
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.log('ERROR:', e.message);
});

req.end();
