/* 
packetizer is great in that it builds packets, but sometimes replies don't
come in in an orderly fashion. if this happens, we need to be able to be able
to route them appropriately. here goes...
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');

function Postmaster (myPacketizer) {
  this.packetizer = myPacketizer;
  this.uart = myPacketizer.uart;
  this.RXQueue = [];
  this.messageQueue = [];
  this.messageCount = 0;
  this.functionQueue = [];
  
  this.packetizer.on('packet', function(data) {
    this.RXQueue.push(data);
  });
}

util.inherits(Postmaster, EventEmitter);

Postmaster.prototype.send = function (message, callback) {
  /*
  send a message and add its callback to the queue. nite that the callback is deferred considerably...
  
  args
    message
      what to send
    callback
      the callback function to call with the resulting data
      
  callback parameters
    err
      error, if applicable
    data
      an array of strings, starting with the original call, ending with either 'OK' or 'ERROR'
  */
  this.messageQueue.push(message);
  this.functionQueue.push(callback);
  this.uart.write(message + '\r\n');
}




