var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');

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
}

util.inherits(GPRS, EventEmitter)

GPRS.prototype.txrx = function(message, timeout, options, callback) {
  /*
  every time we interact with the sim900, it's through a series of uart calls and responses. this fucntion makes that less painful.

  args
    message
      an array of the strings you're sending, ie ['AT', 'AT+CNETSCAN']
    timeout
      milliseconds until we stop listening. it's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it
    options
      expected length of response (in packets) or the contents of the expected end packet, ie 4 or ['OK']
    callback
      callback function
    
  callback parameters
    response
      the text recieved as per options
  */
  
  //  just to be clear
  var self = this;
  
  self.uart.write(message + '\r\n');
    


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
    setTimeout(function() {

    }, )
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