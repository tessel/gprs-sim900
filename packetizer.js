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
    if (array[i] < 14) // not technically always true, hence "selectively"
      decoded += '\n';
    else
      decoded += String.fromCharCode(array[i]);
  }
  return decoded; 
}


function compareToEnder(message, incoming, ender) {
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
  return (message + incoming).slice(message.length - ender.length) === ender;
}


function Packetizer(hardware, baud, ender) {
  /*
  packetize the incoming UART stream

  args
    hardware
      the Tessel port whose UART is being packetized
    baud
      baud rate of the UART
    ender
      charaters at the end of each packet. typically \r\n or similar.

  */

  baud = baud || 19200;
  ender = ender || '\r\n';

  //  get yourself some messages
  this.messages = [];

  // Initialize UART
  this.uart = hardware.UART({baudrate:baud});

  //  packetize
  this.uart.on('data', function(bytes) {
  for (var i = 0; i < bytes.length; i++)
  {
    var thing = decode([bytes[i]]);
    // console.log([thing]);
    if (thing == '\n' && previousCharacter == '\n')
    {
      //  new "packet"! do something with it
      // console.log(latestMessage);
      // printMessage(latestMessage);
      // messages.push(latestMessage);
      latestMessage = '';
      previousCharacter = '';
    }
    else
    {
      latestMessage += thing;
      previousCharacter = thing;
    }
  }
});

} 

module.exports = packetizer;


/* original packetizer from gprs test code

uart.on('data', function(bytes) {
  for (var i = 0; i < bytes.length; i++)
  {
    var thing = decode([bytes[i]]);
    // console.log([thing]);
    if (thing == '\n' && previousCharacter == '\n')
    {
      //  new "packet"
      // console.log(latestMessage);
      printMessage(latestMessage);
      messages.push(latestMessage);
      latestMessage = '';
    }
    else
    {
      latestMessage += thing;
    }

    //  always update
    previousCharacter = thing;
  }

  // bytes.forEach(function(thing)
  // {
  //   var decoded = decode([thing]);
  //   console.log(decoded);
  //   // if (decoded == '\n' )
  // });
});

