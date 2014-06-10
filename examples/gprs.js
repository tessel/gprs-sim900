// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Use the GPRS module to send a text to a phone
number of your choice.
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var gprslib = require('../'); // Replace '../' with 'gprs-sim900' in your own code

var phoneNumber = '##########'; // Replace the #s with the String representation of the phone number, including country code (1 for USA)
var message = 'Text from a Tessel!';

//  Port, callback
var gprs = gprslib.use(hardware); 
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

//  Emit unsolicited messages beginning with...
gprs.emitMe(['NORMAL POWER DOWN', 'RING', '+']);

gprs.on('NORMAL POWER DOWN', function powerDaemon () {
  gprs.emit('powered off');
  console.log('The GPRS Module is off now.');
});

gprs.on('RING', function someoneCalledUs () {
  var instructions = 'Someone\'s calling!\nType the command \'ATA\' to answer and \'ATH\' to hang up.\nYou\'ll need a mic and headset connected to talk and hear.\nIf you want to call someone, type \'ATD"[their 10+digit number]"\'.';
  console.log(instructions);
});

gprs.on('+', function handlePlus (data) {
  console.log('Got an unsolicited message that begins with a \'+\'! Data:', data);
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

//  Handle errors
gprs.on('error', function (err) {
  console.log('Got an error of some kind:\n', err);
});
