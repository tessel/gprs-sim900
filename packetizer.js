var util = require('util');
var EventEmitter = require('events').EventEmitter;

////////////////////////////////////////////////////////////////////////////////

function decode(array) {
  /*
  convert the given array/buffer of bytes to its ASCII representation

  args
    array
      an array-like object of bytes to be interpreted as text
  */

  var decoded = '';
  for (var i = 0; i < array.length; i++)
  {
    if (array[i] == 10 || array[i] == 13) {
      decoded += '\n';    // not technically true
    } else {
      decoded += String.fromCharCode(array[i]);
    }
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

function Packetizer(uart, ender, blacklist, debug) {
  /*
  packetize the incoming UART stream

  args
    uart
      the uart port being packetized
    ender
      charaters at the end of each packet. typically \r\n or similar.
    blacklist
      an array of messages you don't care about, ie ['UNDER-VOLTAGE WARNNING']
  */

  this.debug = debug || false;
  this.ender = ender || '\n';
  this.blacklist = blacklist || ['UNDER-VOLTAGE WARNNING'];

  //  get yourself some messages
  this.messages = [];
  this.packetNumber = 0;
  this.maxBufferSize = 10;
  this.previousCharacter = '';
  this.latestMessage = '';

  // Initialize UART
  this.uart = uart;
}

util.inherits(Packetizer, EventEmitter);

Packetizer.prototype.getPacketCount = function() {
  return this.packetNumber;
};

Packetizer.prototype.bufferSize = function(len) {
  /*
  get/set the buffer size

  args
    len
      the desired max buffer size. leave empty to get the current size

  returns
    the size of the buffer after changes, if any
  */

  if (arguments.length > 0) {
    this.maxBufferSize = len;
  }
  return this.maxBufferSize;
};

Packetizer.prototype.getLatestPackets = function(num) {
  /*
  get the most recent num packets

  args
    num
      how many packets? coerced to be <= the buffer size

  returns
    packets
      an array of the last num packets
  */

  var packets = [];
  for (var i = 0; i < Math.min(num, this.maxBufferSize, this.messages.length); i++) {
    packets.push(this.messages[i]);
  }
  return packets;
};

Packetizer.prototype.checkBlacklist = function(data) {
  /*
  checks to see if the given text is blacklisted

  args
    data
      string to test

  return value
    true if blacklisted, false otherwise
  */

  // console.log('--> checking', data, 'against blacklist...')
  // return this.blacklist.some(function(item) {
  //   return item == data;
  // });
  return (this.blacklist.indexOf(data) > -1);
};

Packetizer.prototype.packetize = function() {
  var self = this;
  this.uart.on('data', function(bytes) {
    for (var i = 0; i < bytes.length; i++)
    {
      var thing = decode([bytes[i]]);
      if (checkEnd(self.latestMessage, thing, self.ender))
      {
        if (!/^\s*$/.test(self.latestMessage + thing) &&
            ! self.checkBlacklist(self.latestMessage))
        {

          if (self.debug){
            console.log("Got a packet", self.latestMessage);
          }
          //  we don't want "empty" or blacklisted packets
          self.emit('packet', self.latestMessage);
          // console.log('--> emitting',  self.latestMessage);
          self.messages.push(self.latestMessage);
          self.packetNumber++;
          if (self.packetNumber > self.maxBufferSize) {
            self.emit('overflow', self.messages.shift());
          }
        }
        if (self.checkBlacklist(self.latestMessage))
        {
          //  sometimes we may want to know
          self.emit('blacklist', self.latestMessage);
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
};

module.exports = Packetizer;
