/* 
packetizer is great in that it builds packets, but sometimes replies don't
come in in an orderly fashion. if this happens, we need to be able to be able
to route them appropriately. here goes...
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');

function Postmaster (myPacketizer, enders, unsolicited, overflow, size) {
  /*
  constructor for the postmaster

  args
    myPacketizer
      a packetizer to listen to
    enders
      an array of strings that constitute the end of a post
    unsolicited
      a callback function to call when an unsolicited packet comes in. callback args are err and data
    overflow
      a callback function to call when the message buffer overflows. callback args are err and data
    size
      size (in packets) of the buffer
  */
  this.packetizer = myPacketizer;
  this.uart = myPacketizer.uart;
  this.RXQueue = [];
  this.callback = null;
  this.message = '';
  var started = false;
  
  this.enders = enders || ['OK', 'ERROR', '> '];
  overflow = overflow || function(err, arg) { 
    if (err) {
      console.log('err: ', err);
    }
    else {
      console.log('overflow!\n', arg);
    };
  }
  unsolicited = unsolicited || function(err, arg) { 
    if (err) {
      console.log('err:\n', err);
    }
    else {
      console.log('unsolicited:\n', arg);
    };
  }
  size = size || 15;

  var self = this;
  
  //  when we get a packet, see if it starts or ends a message
  this.packetizer.on('packet', function(data) {
    //  if we aren't busy, or if we are busy but the first part of the reply doesn't match the message, it's unsolicited
    if (self.callback === null || (data != self.message && !started)) {
      self.emit('unsolicited', null, data);
    }
    else if (started || data === self.message) {
      started = true;
      self.RXQueue.push(data);
    }
    //  check to see of we've finished the post
    if (self.enders.indexOf(data) > -1) {
      var temp = self.RXQueue;
      self.RXQueue = [];
      started = false;
      self.emit('post', null, temp);
    }
    //  check overflow
    if (self.RXQueue.length > size) {
      self.emit('overflow', null, self.RXQueue);
      self.RXQueue = [];
      started = false;
      self.message = '';
    }
  });

  this.on('overflow', overflow);
  this.on('unsolicited', unsolicited);
}

util.inherits(Postmaster, EventEmitter);

Postmaster.prototype.send = function (message, patience, callback, debug) {
  /*
  send a message and add its callback to the queue. nite that the callback is deferred considerably...
  
  args
    message
      what to send
    callback
      the callback function to call with the resulting data
    patience
      ms to wait before returning with an error
    debug
      debug flag
      
  callback parameters
    err
      error, if applicable
    data
      an array of strings, starting with the original call, usually ending with either 'OK', '>', or 'ERROR'
  */

  var self = this;
  debug = debug || false;

  if (self.callback != null) {
    callback(new Error('Postmaster busy'), []);
  }
  else {
    //  set things up
    self.callback = callback;
    patience = patience || 10000;
    
    self.message = message;
    self.uart.write(message);
    self.uart.write('\r\n');
    if (debug) {
      console.log('sent', [message], 'on uart', [uart]);
    }

    var reply = function(err, reply) {
      var temp = self.callback;
      self.callback = null;
      if (temp) {
        temp(err, reply);
        // console.log(reply);
      }
    }
  
    //  if we time out
    var panic = setTimeout(function() {
      self.removeListener('post', reply);
      reply(new Error('no reply after ' + patience + ' ms to message "' + message + '"'), []);
    }, patience);
  }
    //  if we get something
    self.once('post', function(err, data) {
      clearTimeout(panic);
      reply(err, data);
    });
  
}


module.exports = Postmaster;