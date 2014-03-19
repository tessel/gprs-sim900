var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');
var Postmaster = require('./postmaster.js');

function GPRS (hardware, secondaryHardware) {
  /*
  constructor

  args
    hardware
      the tessel port to be used for priary communication
    secondaryHardware
      the additional port that can be used for debug purposes. not required. Typically, D/A will be primary, C/B will be secondary
  */
  var self = this;

  self.hardware = hardware;
  self.uart = new hardware.UART({baudrate: 19200});
  self.power = hardware.gpio(3);
  self.packetizer = new Packetizer(self.uart);
  self.packetizer.packetize();
  //  the defaults are fine for most of Postmaster's args
  self.postmaster = new Postmaster(self.packetizer, ['OK', 'ERROR']);

  //  second debug port is optional and largely unnecessary
  self.debugHardware = null;
  //  ring indicator can be useful, though
  self.ringIndicator = null;
  if (arguments.length > 1) {
    self.debugHardware = secondaryHardware;
    self.debugUART = secondaryHardware.UART({baudrate: 115200});
    self.ringIndicator = secondaryHardware.gpio(3);
    self.debugPacketizer = new Packetizer(self.debugUART);
    self.debugPacketizer.packetize();
  }

  self._establishContact();
}

util.inherits(GPRS, EventEmitter)


GPRS.prototype.txrx = function(message, patience, callback) {
  /*
  every time we interact with the sim900, it's through a series of uart calls and responses. this fucntion makes that less painful.

  args
    message
      string you're sending, ie 'AT'
    patience
      milliseconds until we stop listening. it's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it.
    callback
      callback function
    
  callback parameters
    recieved
      the first packet recieved during the interval
  */
  
  var self = this;

  message = (message || 'AT') + '\r\n';
  patience = patience || 250;
  callback = callback || ( function(err, arg) { 
    if (err) {
      console.log('err:\n', err);
    }
    else {
      console.log('reply:\n', arg);
    };
  });
  //  it's a virtue, but mostly the module won't work if you're impatient
  patience = Math.max(patience, 100);
  var myError = null;

  self.postmaster.send(message, patience, callback);

  // //  send if there's anything to send
  // if (arguments.length) {
  //   self.uart.write(message);
  // }

  // //  if we get something
  // var success = function(response) {
  //   //  clear the kill
  //   clearTimeout(myImpatience);
  //   callback(myError, response);
  // }
  // self.packetizer.once('packet', success(response));

  // //  if we time out and don't get anything then we thrown an error
  // var myImpatience = setTimeout( function() {
  //   self.packetizer.removeListener('packet', success);
  //   myError = new Error('no response within timeout of' + patience + 'ms');
  //   return callback(myError);
  // }, patience);
}

GPRS.prototype._establishContact = function(callback) {
  /*
  make contact with the GPRS module, emit the 'ready' event

  args
    callback
      callback function

  callback parameters
    none
  */

  var self = this;

  var stage = 1;
  var contacted = false;
  for (var i = 0; i < 5; i++)
  {
    self.uart.write('AT\r\n');
    var firstTry = self.packetizer.once(function (reply)
    {
      if (reply == 'AT')
      {
        stage++;
        self.packetizer.once(function (reply) {
          if (reply == 'OK')
          {
            stage++;
          }
        });
      }
    });
    // setTimeout(function() {
    //   ;
    // }, );
  }

  
};

GPRS.prototype.sendSMS = function(number, message, callback) {
  /*
  send an SMS to the specified number

  args
    number
      a string representation of the number. must be at least 10 digits
    message
      a string to send
    callback
      callback function

  callback parameters
    none
  */

  var self = this;

  number = String(number) || '15555555555';
  message = message || 'text from a Tessel';

}

GPRS.prototype.dial = function(number, callback) {
  /*
  call the specified number

  args
    number
      a string representation of the number. must be at least 10 digits
    callback
      callback function

  callback parameters
    call
      a call object
  */

  var self = this;
}

GPRS.prototype.answerCall = function(callback) {
  /*
  answer an incoming voice call

  args
    callback
      callback function

  callback parameters
    call
      a call object
  */

  var self = this;
}

GPRS.prototype.ignoreCall = function(callback) {
  /*
  ignore an incoming voice call

  args
    callback
      callback function

  callback parameters
    none
  */

  var self = this;
}

GPRS.prototype.readSMS = function(messageNumber, callback) {
  /*
  answer an incoming voice call

  args - two possibilities
    messageNumber
      the index of the message to read. if not specified, the newest message is read
    callback
      callback function

  callback parameters
    err
      error
    message
      the SMS string
  */

  var self = this;
}