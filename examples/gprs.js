// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Use the GPRS module to send a text to a phone
number of your choice.
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var baud = 115200; // Typically keep this at 115200, but you can set it to 9600 if you're hitting buffer overflows

var phoneNumber = '##########'; // Replace the #s with the String representation of 10+ digit number, including country code (1 for USA)
var message = 'Text from a Tessel!';

//  Port, baud (115200 by default), callback
var gprs = require('../').use(hardware, baud); // Replace '../' with 'gprs-sim900' in your own code

gprs.on('ready', function() {
  console.log('GPRS module connected to Tessel. Searching for network...')
  //  Give it 10 more seconds to connect to the network, then try to send an SMS
  setTimeout(function() {
    console.log('Sending', message, 'to', phoneNumber, '...');
    // Send message
    gprs.sendSMS(phoneNumber, message, function smsCallback(err, data) {
      if (err) {
        return console.log(err);
      }
      var success = data[0] !== -1;
      console.log('Text sent:', success);
      if (success) {
        // If successful, log the number of the sent text
        console.log('GPRS Module sent text #', data[0]);
      }
    });
  }, 10000);
});

//  Emit unsolicited messages beginning with... (this is useful in the case of incoming calls and texts)
gprs.emitMe(['+', 'NORMAL POWER DOWN']);

gprs.on('+', function handlePlus (data) {
  console.log('\nGot an unsolicited message!\n\t', data);
});

gprs.on('NORMAL POWER DOWN', function powerDaemon () {
  gprs.emit('powered off');
  console.log('The GPRS Module is off now.');
});

//  Command the GPRS module via the command line with `tessel run gprs.js -m`
process.on('message', function (data) {
  console.log('got command', [data.slice(1, data.length - 1)]);
  gprs._txrx(data.slice(1, data.length - 1), 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});
