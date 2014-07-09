// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Control the GPRS Module from the command line. Useful
for development and testing.

Some ASCII key combinations can't be sent over the command line but are needed
to command the SimCom900 module. For example, Ctrl+Z denotes the end of text
input when sending SMS messages. To get around this we have a `specialCases`
array. You may need to add more special cases depending on your needs

Reference documents:
http://www.simcom.us/act_admin/supportfile/SIM900_HD_V1.01(091226).pdf
http://www.propox.com/download/docs/SIM900_Application_Note.pdf
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var gprslib = require('../'); // Replace '../' with 'gprs-sim900' in your own code

// support non-typeable ASCII characters
// you may need to add more depending on your needs
var specialCases = [{
    keyPress: '^z',
    command: new Buffer([0x1a])
}];

// if data matches any special case key press
// set data to the special case command
function checkSpecialCases(data) {
  specialCases.forEach(function(value) {
    if(data.toLowerCase() === value.keyPress.toLowerCase()){
      data = value.command;
    }
  });
  return data;
}

//  Port, callback
var gprs = gprslib.use(hardware);
gprs.on('ready', function() {
  console.log('GPRS module connected to Tessel.');
  console.log('-------');
  console.log('You can now send AT commands. Try: `AT+CGATT?`.');
  console.log('This command will return `+CGATT: (0|1)`, where 1');
  console.log('means the module is connected to a network.');
  console.log('-------');
  console.log('Searching for network now...');
});

//  Command the GPRS module via the command line
process.stdin.resume();
process.stdin.on('data', function (data) {
  data = String(data).replace(/[\r\n]*$/, '');  //  Removes the line endings
  data = checkSpecialCases(data);
  console.log('got command', [data]);
  gprs._txrx(data, 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});
