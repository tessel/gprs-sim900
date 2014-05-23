// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');

var portname = process.argv[2] || 'A';
var gprs = require('../').use(tessel.port[portname]);

console.log('1..2');
gprs.on('ready', function (data) {
  console.log('ok');
  console.log(data && data[data.length-1] == 'OK' ? 'ok' : 'not ok', '-', 'checking ready packet', data);
  gprs.disable();
});

/*
// Heartbeat
tessel.led[1].high();
tessel.led[2].low();
setInterval(function () {
  tessel.led[1].toggle();
  tessel.led[2].toggle();
}, 150);
*/
