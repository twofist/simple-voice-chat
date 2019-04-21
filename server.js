const WebSocketServer = require('ws').Server;
const express = require('express');
const https = require('https');
const app = express();
const fs = require('fs');

const pkey = fs.readFileSync('./ssl/key.pem');
const pcert = fs.readFileSync('./ssl/cert.pem');
const options = { key: pkey, cert: pcert, passphrase: '123456789' };
let wss = null;
let sslSrv = null;

app.use(express.static('public'));

app.use(function (req, res, next) {
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  next();
});

sslSrv = https.createServer(options, app).listen(443);
console.log("The HTTPS server is up and running");

wss = new WebSocketServer({ server: sslSrv });
console.log("WebSocket Secure server is up and running.");

wss.on('connection', function (client) {
  console.log("A new client was connected.");
  client.on('message', function (message) {
    wss.broadcast(message, client);
  });
});

wss.broadcast = function (data, exclude) {
  console.log("Broadcasting message to all WebSocket clients.");
  this.clients.forEach((element) => {
    if (element !== exclude && element.readyState === element.OPEN) {
      element.send(data);
    }
  });
};