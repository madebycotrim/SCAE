// Test script to diagnose the backend and hardware directly.
const http = require('http');
const https = require('https');

// Test 1: IDFlex Ping
const reqPing = http.request({
  host: '192.168.1.34',
  port: 8080,
  path: '/system_information.fcgi',
  method: 'POST'
}, (res) => {
    console.log('[IDFlex Test] Ping response code:', res.statusCode);
});
reqPing.on('error', (e) => {
    console.log('[IDFlex Test] Ping ERROR:', e.message);
});
reqPing.end();

// Test 2: Cloudflare Ping
const reqCf = https.request({
    hostname: 'scae.pages.dev',
    path: '/api/agente/heartbeat-ping',
    method: 'GET'
}, (res) => {
    console.log('[Cloudflare Test] Ping response code:', res.statusCode);
});
reqCf.on('error', (e) => {
    console.log('[Cloudflare Test] Ping ERROR:', e.message);
});
reqCf.end();
