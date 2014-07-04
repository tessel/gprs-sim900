/* 
Packetizer is great in that it builds packets, but sometimes replies don't
come in in an orderly fashion. If this happens, we need to be able to be able
to route them appropriately.
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Postmaster (myPacketizer, enders, overflow, size, debug) {
  /*
  Constructor for the postmaster

  args
    myPacketizer
      A packetizer to listen to
    enders
      An Array of Strings that constitute the end of a post
    overflow
      A callback function to call when the message buffer overflows. Callback args are err and data
    size
      Size (in packets) of the buffer
    debug
      Are we in debug mode?
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
    } else {
      console.log('overflow!\n', arg);
    }
  };
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
      console.log('postmaster got packet: ' + [data], '\nstarts:', starts, '\nenders:', enders);
    }

    //  if we aren't busy, or if we are busy but the first part of the reply doesn't match the message, it's unsolicited
    if ((self.callback === null || (!self.started && starts.indexOf(data) === -1)) 
      && !(!self.started && self.alternate && self.alternate[2] 
      && self.alternate[0].filter(function(partialStart) {
        if (self.debug) {
          console.log([data], [partialStart], data.indexOf(partialStart));
        }
        return data.indexOf(partialStart) === -1;
      }).length != self.alternate[0].length)) {
      //  ^check that we're not using soft logic either...
      self.emit('unsolicited', data); 
    }
    else {
      if (self.debug) {
        console.log('adding', [data], 'to the RXQueue');
        }
      self.started = true;
      self.RXQueue.push(data);
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
}

util.inherits(Postmaster, EventEmitter);

Postmaster.prototype.send = function (message, patience, callback, alternate, debug) {
  /*
  Aend a message and add call its callback with the data from the reply
  
  args
    message
      What to send (String or Buffer)
    callback
      The callback function to call with the resulting data
    patience
      Miliseconds to wait before returning with an error
    alternate
      An Array of Arrays of alternate starts and ends of the reply post (Strings). Of the form [[s1, s2 ...], [e1, e2, ...]]. These values are used in place of traditional controls.
      If the third element of alternate is truth-y, then the given start values only need exist within the incoming data (good for posts with known headers but unknown bodies).
    debug
      Debug flag
      
  Callback parameters
    err
      Error, if applicable
    data
      An array of Strings, usually starting with the original call, usually ending with one of 'OK', '>', or 'ERROR'
  */

  var self = this;

  if (self.callback !== null) {
    callback(new Error('Postmaster busy'), []);
  } else {
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
      console.log('sent', [message], 'on uart', [self.uart]);
    }

    var reply = function(err, data) {
      var temp = self.callback;
      self.callback = null;
      if (temp) {
        temp(err, data);
      }
    };


    //  if we time out
    var panic = setTimeout(function() {
      self.removeListener('post', reply);
      var err = new Error('no reply after ' + patience + ' ms to message "' + message + '"');
      err.type = 'timeout';
      reply(err, []);
    }, patience);
    //  if we get something

    self.once('post', function(err, data) {
      // self.removeAllListeners('post'); // WORKAROUND: see bug https://github.com/tessel/runtime/issues/226
      clearTimeout(panic);
      if (self.debug) {
        console.log("postmaster replying", data);
      }
      reply(err, data);
    });
  }
};

Postmaster.prototype.forceClear = function(typ)
{
  //  Reset the postmaster to its default state, emit what you have as unsolicited
  var type = typ || 'unsolicited';
  this.emit(type, this.RXQueue);
  this.RXQueue = [];
  this.callback = null;
  this.message = '';
  this.started = false;
  this.alternate = null;
  this.enders = ['OK', 'ERROR'];
};


module.exports = Postmaster;
