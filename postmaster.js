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
  
  this.enders = enders || ['OK', 'ERROR'];
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
      an array of strings, starting with the original call, ending with either 'OK' or 'ERROR'
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
    self.uart.write(message + '\r\n');
    if (debug) {
      console.log('sent', [message], 'on uart', [uart]);
    }

    var reply = function(err, reply) {
      if (self.callback) {
        self.callback(err, reply);
        // console.log(reply);
      }
      self.callback = null;
    }
  
    //  if we get something
    self.once('post', reply);
  
    //  if we time out
    setTimeout(function() {
      self.removeListener('post', reply);
      reply(new Error('no reply after ' + patience + ' ms'), []);
    }, patience);
  }
}




    // if (this.messageQueue.length == 0) {
    // var message = messageQueue[0].message;
    // var func = messageQueue[0].func;
    // //  if we weren't already packing, check to see if we should be
    // else if (!this.pack && data.indexOf(message.slice(0, message.lastIndexOf('_'))) > -1) {
    //     this.pack = true;
    //   }
    // // if we aren't building a packet, then the message was unsolicited.
    // else if (!this.pack) {
    //   this.emit('unsolicited', data);
    // }
    // //  otherwise, we're packing!
    // else {
    //   //  add the message to the back of the queue
    //   self.RXQueue.push(data);

    //   //  check to see if we're done
    //   if (this.enders.indexOf(data) > -1) {
    //     var temp = this.RXQueue;
    //     this.RXQueue = [];
    //     // var func = functionQueue.shift();
    //     this.emit(this.messageQueue.shift(), temp);
    //   }
    

    //   //  loop through each sent message to see if we have a match
    //   for (var i = 0; i < messageQueue.length; i++) {
    //     var message = this.messageQueue[i];
    //     var func = this.functionQueue[i];
    //     var content = this.RXQueue.shift();

    //     //  if we match the message, we need to start building a packet
    //     if (!this.pack && data.indexOf(message.slice(0, message.indexOf('_'))) > -1) {
    //       this.pack = true;
    //       this.parcels.message = [];
    //     }
    //     if (this.pack) {
    //       this.parcels.message.push(this.RXQueue.shift())
    //     }
    //   }
    // }


    // self.messageQueue.forEach(function(message) {
    //   var pack = false;
    //   var parcel = [];
    //   //  loop through the recieved data

    //   while(RXQueue.length) {
    //     // if we have RX data, we are either packing a parcel or have an unsolicited message

    //     //  if the message is in the recieved data, we're staring a new parcel
    //     if (rx.indexOf(message.slice(0,message.indexOf('_'))) > -1) {
    //       pack = true;
    //     }
    //     //  if we're not packing a parcel, then the message was unsolicited and it was also the last one pushed on. emit it and break.
    //     else if (!pack) {
    //       this.emit('unsolicited', RXQueue.pop());
    //       break;
    //     }
    //     if (pack) {
    //       var widget = RXQueue.shift();
    //       parcel.push(widget);
    //       if (widget.indexOf('OK') > -1 || widget.indexOf('ERROR') > -1) {
    //         //  we're done
    //         this.emit(message, )
    //         break;
    //       }
    //     }
    //   }


      // self.RXQueue.forEach(function(rx) {
      //   //  if we're packing a message or the original message is in the recieved data, then we're packing 
      //   if (pack || rx.indexOf(message.slice(0,message.indexOf('_'))) > -1) {
      //     pack = true;
      //     //  if we;re building, then we add the popped message to the parcel
      //   }
      // });
    // });


module.exports = Postmaster;