/* 
packetizer is great in that it builds packets, but sometimes replies don't
come in in an orderly fashion. if this happens, we need to be able to be able
to route them appropriately. here goes...
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');

function Postmaster (myPacketizer, enders, unsolicited, overflow, size, debug) {
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
    debug
      are we in debug mode?
  */
  this.packetizer = myPacketizer;
  this.uart = myPacketizer.uart;
  this.RXQueue = [];
  this.callback = null;
  this.message = '';
  this.started = false;
  this.alternate = null;
  this.enders = enders || ['OK', 'ERROR'];
  this.debug = debug || false;
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
    var starts = [self.message];
    var enders = self.enders;
    if (self.alternate) {
      //  use the alternate starts and ends
      starts = self.alternate[0];
      enders = self.alternate[1];
    }

    if (self.debug) {
      console.log('got a packet with ' + [data], '\nstarts:', starts, '\nenders:', enders);
    }

    //  if we aren't busy, or if we are busy but the first part of the reply doesn't match the message, it's unsolicited
    // if (self.callback === null || (data != self.message && !self.started) || (self.alternate && self.alternate[0].indexOf(data) > -1)) {
    //  
    if ((self.callback === null || (!self.started && starts.indexOf(data) === -1)) && !(!self.started && self.alternate && self.alternate[2] && self.alternate[0].filter(function(partialStart) {
        if (self.debug) {
          console.log([data], [partialStart], data.indexOf(partialStart));
        }
        return data.indexOf(partialStart) === -1;
      }).length != self.alternate[0].length)) {
      //  check that we're not using soft logic either...
      self.emit('unsolicited', null, data); 
    }
    // else if (self.started || data === self.message || data === self.alternate.inde || self.alternate === false) {
    else {
      // if (self.started || starts.indexOf(data) > -1) {
      if (self.debug) {
        console.log('adding', [data], 'to the RXQueue');
      }
      self.started = true;
      self.RXQueue.push(data);
      // }
      //  check to see of we've finished the post
      if (enders.indexOf(data) > -1) {
        if (self.debug) {
          console.log('\t---> Found '+ data + ' in enders:\n', enders, '\nEmitting a post with:\n', self.RXQueue);
        }
        var temp = self.RXQueue;
        self.RXQueue = [];
        self.started = false;
        self.alternate = null;
        self.emit('post', null, temp);
      }
    }
    //  check overflow
    if (self.RXQueue.length > size) {
      self.emit('overflow', null, self.RXQueue);
      self.RXQueue = [];
      self.started = false;
      self.alternate = null;
      self.message = '';
    }
  });

  this.on('overflow', overflow);
  this.on('unsolicited', unsolicited);
}

util.inherits(Postmaster, EventEmitter);

Postmaster.prototype.send = function (message, patience, callback, alternate, debug) {
  /*
  send a message and add call its callback with the data from the reply
  
  args
    message
      what to send
    callback
      the callback function to call with the resulting data
    patience
      ms to wait before returning with an error
    alternate
      an array of arrays of alternate starts and ends of reply post. of the form [[s1, s2 ...],[e1, e2, ...]]. used in place of traditional controls.
      if the third element of alternate is truth-y, then the given start values only need exist within the incoming data (good for posts with known headers but unknown bodies) 
    debug
      debug flag
      
  callback parameters
    err
      error, if applicable
    data
      an array of strings, usually starting with the original call, usually ending with one of 'OK', '>', or 'ERROR'
  */

  var self = this;
  self.debug = debug || false;

  if (self.callback != null) {
    callback(new Error('Postmaster busy'), []);
  }
  else {
    if (alternate) {
      self.alternate = alternate;
    }
    //  set things up
    self.callback = callback;
    patience = patience || 10000;
    
    self.message = message;
    self.uart.write(message);
    self.uart.write('\r\n');
    if (self.debug) {
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
    //  if we get something
    self.once('post', function(err, data) {
      clearTimeout(panic);
      reply(err, data);
    });
  }
}

Postmaster.prototype.forceClear = function(type)
{
  //  Reset the postmaster to its default state, emit what you have as unsolicited
  this.emit(type || 'unsolicited', null, RXQueue);
  this.RXQueue = [];
  this.callback = null;
  this.message = '';
  this.started = false;
  this.alternate = null;
  this.enders = ['OK', 'ERROR'];
}


module.exports = Postmaster;