// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Use the GPRS module to send a text to a phone
number of your choice.
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var baud = 115200; // Typically keep this at 115200, but you can set it to 9600 if you're hitting buffer overflows

var phoneNumber = '##########'; // String representation of the 10+ digit number you want to reach. Country code for USA is 1
var message = 'Text from a Tessel!'; // Text message to send

var gprs = require('../').use(hardware, baud); // Replace '../' with 'gprs-sim900' in your own code

gprs.on('ready', function() {
  //  Give it 30 more seconds to connect to the network
  console.log('GPRS module connected, searching for network...');
  setTimeout(function sendText() {
    // Send the text
    console.log('Sending', '\'' + message + '\'', 'to', phoneNumber + '...');
    gprs.sendSMS(phoneNumber, message, function (err, data) {
      var success = data[0] !== -1;
      console.log('Text sent:', success);
      if (success) {
        console.log('Reply from the SIM900 (text number):\t', data);
      } else {
        console.log('Retrying...');
        sendText();
      }
    });
  }, 30000);
});
