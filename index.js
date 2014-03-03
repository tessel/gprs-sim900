var util = require('util');
var EventEmitter = require('events').EventEmitter;

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

  self.debugHardware = null;
  self.ringIndicator = null;
  if (arguments.length > 1) {
    self.debugHardware = secondaryHardware;
    self.debugUART = secondaryHardware.UART({baudrate: 115200});
    self.ringIndicator = secondaryHardware.gpio(3);
  }


}

util.inherits(GPRS, EventEmitter)

function txrx(uart, message, timeout, expected) {
  /*
  every time we interact with the sim900, it's through a series of uart calls and responses. this fucntion makes that less painful.

  args
    uart
      the uart object we're using to commuicate
    message
      the string you're sending
    timeout
      how long until we stop listening. it's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it
    expected


  */
  uart.write(message);

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

  self.uart.write('AT\r\n');

  self.uart.once(function (data)
  {

  });
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