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
    err
      error object
    recieved
      the reply recieved within the interval
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

  self.postmaster.send(message, patience, callback);
}

GPRS.prototype._establishContact = function(callback) {
  /*
  make contact with the GPRS module, emit the 'ready' event

  args
    callback
      callback function

  callback parameters
    err
      an error
    contacted
      true/false
  */

  var self = this;

  var pings = 0;
  var timeouts = 0;
  var contacted = false;

  //  457 is pseudorandom...and unlikely to be used elsewhere
  self.postmaster.send('AT', 457, function(err, data) {
    if (err && err.message === 'no reply after 457 ms to message "AT"') {
      //  if we timeout on an AT, we're probably off. toggle the power button
      self.power.high();
      setTimeout(function() {
        self.power.low();
        setTimeout(function() {
          self.power.high();
        }, 1000);
      }, 1000);
    }
    //this is where we want to be
    else if (data === ['AT', 'OK']) {
      callback(null, true);
    }
    else {
      callback(err, false);
    }
  });
}

  

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