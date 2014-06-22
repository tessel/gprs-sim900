/* 
Packetizer is great in that it builds packets, but sometimes replies don't
come in in an orderly fashion. If this happens, we need to be able to be able
to route them appropriately.
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
* Iterate each value of array and check if value contains
* a specific string. 
* 
* Differs from indexOf in that it performs indexOf on each
* value in the string, so only a partial match is needed.  
*
* @param string, the string to search for 
* @returns true if match, else false
* @note will return true at first occurrence of match
* @note will check value.indexOf(string) AND string.indexOf(value)
* @example:
*
* ['Apple', 'Pear'].indexOf('Pear') === 1
* ['Apple', 'Pear'].indexOf('Pe') === -1
* ['Apple', 'Pear'].indexOf('Pearing') === -1
* 
* ['Apple', 'Pear'].softContains('Pear') === true
* ['Apple', 'Pear'].softContains('Pe') === true
* ['Apple', 'Pear'].softContains('Pearing') === true
*
*/
Array.prototype.softContains = function(searchStr) {
  for (var i=0; i<this.length; i++) {
    console.log('---->>>', this[i], searchStr, this[i].indexOf(searchStr), searchStr.indexOf(this[i]));
    if(this[i].indexOf(searchStr) !== -1) return true;
    if(searchStr.indexOf(this[i]) !== -1) return true;
  }
  return false;
}

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
    // wraps message as default start
    // this means a reply packet must start with the message
    // to be valid. 
    // ex: ['AT']
    var starts = [self.message]; 
    var enders = self.enders;
    // If true, the values of `start` only need to exist 
    // within the incoming data, instead of at the beginning of the packet. 
    // Good for posts with known headers but unknown bodies
    var useSoftContains, useAlternate;
    
    // if true, we are using alternate starts and enders
    if (self.alternate) {
      // array of valid start strings, ex: ['AT', 'OK', 'LETS BEGIN']
      starts = self.alternate[0]; 
      enders = self.alternate[1];
      // use the alternate starts, enders
      useAlternate = true;
      // use soft checking of start array
      useSoftContains = self.alternate[2] ? true : false;
    } else {
      useAlternate = false;
      useSoftContains = false;
    }

    if (self.debug) {
      console.log('postmaster got packet: ' + [data], '\nstarts:', starts, '\nenders:', enders);
    }

    function hasCallback() {
      return self.callback !== null; 
    }

    function hasStarted() {
      return self.started;
    }

    function isDataInStartArrayStrict() {
      return starts.indexOf(data) === -1 ? false : true;
    }

    // returns true is data is contained in alternate array
    // which is determined by comparing the length of the array to the 
    // length of the array when we remove items matching data
    //
    // Sometimes packet contains other characters in addition to
    // the string we want, for example:
    //   ['OK=2'].indexOf('OK')
    // in this case indexOf will not be truthy, while
    //   ['OK=1'].softContains('OK')
    // will be truthy.
    // 
    // These type of responses from the sim900 chip are common when querying
    // statuses. For example 
    //   AT+CGATT?
    // will return differently based on status, for example both
    //   +CGATT: 0
    //   +CGATT: 1
    // are valid responses. By using softContains we can assure that both
    // are valid enders. 
    //
    function isDataInStartArraySoft() {
      return starts.softContains(data);
    }

    console.log('---------------');
    console.log('hasCallback', hasCallback());
    console.log('hasStarted', hasStarted());
    console.log('useSoftContains', useSoftContains);
    console.log('isDataInStartArrayStrict', isDataInStartArrayStrict());
    console.log('isDataInStartArraySoft', isDataInStartArraySoft());

    // if we aren't busy, 
    // or if we are busy but the first part of the reply doesn't match the message, 
    // or if we are busy and we are using alternates and 
    // it's unsolicited
    function checkIsUnsolicited() {
      if(!hasCallback()) {
        console.log('---->>>>>>> Condition 1');
        return true;
      }
      if(!hasStarted() && !useSoftContains && !isDataInStartArrayStrict()) {
        console.log('---->>>>>>> Condition 2');
        return true;
      }
      if(!hasStarted() && useSoftContains && !isDataInStartArraySoft()) {
        console.log('---->>>>>>> Condition 3');
        return true;
      }
      return false;
    }

    var isUnsolicited = checkIsUnsolicited();

    console.log('isUnsolicited', isUnsolicited);
    console.log('---------------');

    // if ((self.callback === null || (!self.started && starts.indexOf(data) === -1)) && !(!self.started && self.alternate && self.alternate[2] && self.alternate[0].filter(function(partialStart) {
    //     if (self.debug) {
    //       console.log([data], [partialStart], data.indexOf(partialStart));
    //     }
    //     return data.indexOf(partialStart) === -1;
    //   }).length != self.alternate[0].length)) {
    //   //  ^check that we're not using soft logic either...
    //   self.emit('unsolicited', data); 
    // }

    //  if we aren't busy, or if we are busy but the first part of the reply doesn't match the message, it's unsolicited
    if (isUnsolicited) {
      //  ^check that we're not using soft logic either...
      console.log('->>>>>>>>>> unsolicited');
      console.log(data);
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

  self.debug = debug || true;

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
      self.removeAllListeners('post'); // WORKAROUND: see bug https://github.com/tessel/runtime/issues/226
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
