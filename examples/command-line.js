// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Control the GPRS Module from the command line. Useful
for development and testing. 

Reference document:
http://www.simcom.us/act_admin/supportfile/SIM900_HD_V1.01(091226).pdf

!!! Important Note:
some commands can't normally be sent in the command line, 
for example Ctrl+Z which is required to end an SMS input. To get 
around this, certain inputs trigger these special commands. 
See the line `if(data === '^Z')` below.

You may need to add more depending on your needs.  
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
  // this is a trick to allow ending an input when sending SMS
  // normally pressing Ctrl+Z on a mac send the process into the background
  if(data.toLowerCase() === '^z' ) {
    data = new Buffer([0x1a]); // Ctrl+Z
  }
  console.log('got command', [data]);
  gprs._txrx(data, 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});