// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Control the GPRS Module from the command line. Useful
for development and testing. 

Reference document: 
http://www.simcom.us/act_admin/supportfile/SIM900_HD_V1.01(091226).pdf 
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var gprslib = require('../'); // Replace '../' with 'gprs-sim900' in your own code

//  Port, callback
var gprs = gprslib.use(hardware); 
gprs.on('ready', function() {
  console.log('GPRS module connected to Tessel.');
  console.log('Searching for network... try some commands!');
});

//  Command the GPRS module via the command line
process.stdin.resume();
process.stdin.on('data', function (data) {
  data = String(data).replace(/[\r\n]*$/, '');  //  Removes the line endings
  console.log('got command', [data]);
  gprs._txrx(data, 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});