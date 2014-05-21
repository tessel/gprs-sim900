// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');
var hardware = tessel.port('A');

var gprs = require('../').use(hardware);

//  Handle some unsolicited messages
var handlePlus = function(data) {
  console.log('\nGot an unsolicited message!\n\t', data);
};
var powerDaemon = function() {
  gprs.emit('powered off');
  console.log('The GPRS Module is off now.');
};
gprs.notifyOn({'+' : handlePlus, 'NORMAL POWER DOWN' : powerDaemon});

gprs.on('ready', function() {
  //  Give it 30 more seconds to connect to the network, then try to send an SMS
  setTimeout(function() {
    var smsCallback = function(err, data) {
      console.log('Did we send the text?\t', data[0] !== -1);
      if (data[0] !== -1) {
        console.log('Reply from the SIM900 (text number):\t', data);
      }
    };
    //  Replce the #s with the String representation of 10+ digit number
    //  (hint: the U.S.'s country code is 1)
    console.log('Trying to send an SMS now');
    gprs.sendSMS('##########', 'Text from a Tessel!', smsCallback);
  }, 300);
});

//  Command the GPRS module via the command line with tessel-node
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

// Do some blinky to show we're alive
var led1 = tessel.led(1).output().high();
var led2 = tessel.led(2).output().low();
setInterval(function () {
  led1.toggle();
  led2.toggle();
}, 150);
