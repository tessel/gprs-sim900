var tessel = require('tessel');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

////////////////////////////////////////////////////////////////////////////////

function decode(array) {
  /*
  selectively convert the given array/buffer of numbers to their ASCII representation

  args
    array
      an array-like object of bytes to be interpreted as text
  */

  var decoded = '';
  for (var i = 0; i < array.length; i++)
  {
    if (array[i] == 10 || array[i] == 13) 
      decoded += '\n';    // not technically true
    else
      decoded += String.fromCharCode(array[i]);
  }
  return decoded; 
}


function checkEnd(message, incoming, ender) {
  /*
  check to see if we're done with this packet

  args
    message
      the message so far
    incoming
      latest byte/character
    ender
      the packet termination sequence

  return
    true/false if the packet should end
  */

  // the slow way: 
  // return (message + incoming).indexOf(ender) != -1;

  // the fast way:
  return (message + incoming).slice(message.length - ender.length + 1) === ender;
}


function Packetizer(uart, ender) {
  /*
  packetize the incoming UART stream

  args
    uart
      the uart port being packetized
    ender
      charaters at the end of each packet. typically \r\n or similar.
  */

  this.ender = ender || '\n\n';

  //  get yourself some messages
  this.messages = [];
  this.previousCharacter = '';
  this.latestMessage = '';

  // Initialize UART
  this.uart = uart;
} 

util.inherits(Packetizer, EventEmitter);

Packetizer.prototype.packetize = function() {
  var self = this;
  this.uart.on('data', function(bytes) {
    for (var i = 0; i < bytes.length; i++)
    {
      var thing = decode([bytes[i]]);
      if (checkEnd(self.latestMessage, thing, self.ender))
      {
        if (!/^\s*$/.test(self.latestMessage + thing))
        {
          //  we don't want "empty" packets 
          self.emit('packet', self.latestMessage)
          self.messages.push(self.latestMessage);
        }
        self.latestMessage = '';
        self.previousCharacter = '';
      }
      else
      {
        self.latestMessage += thing;
        self.previousCharacter = thing;
      }
    }
  });
}

module.exports = Packetizer;