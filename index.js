// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

/*
At the center of Tessel's GPRS Module lies the SIM900, documentation
for which, including a full list of commands, can be found at:
http://wm.sim.com/producten.aspx?id=1019

The full AT command manual is here:
http://wm.sim.com/upfile/2013424141114f.pdf
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');
var Postmaster = require('./postmaster.js');

var DEBUG = false;  //  Debug messages to the console

// Constructor
function GPRS (hardware) {
  /*
  Args
    hardware
      The Tessel port to be used for priary communication
  */

  var self = this;

  self.hardware = hardware;
  self.uart = new hardware.UART({baudrate: 15200});
  self.power = hardware.digital[2].high();
  self.packetizer = new Packetizer(self.uart);
  self.packetizer.packetize();
  self.inACall = false;
  self.emissions = [];
  self.powered = null;
  //  The defaults are fine for most of Postmaster's args
  self.postmaster = new Postmaster(self.packetizer, ['OK', 'ERROR', '> ', 'DOWNLOAD'], null, null, DEBUG);
}

util.inherits(GPRS, EventEmitter);

// Make contact with the GPRS module, emit the 'ready' event
GPRS.prototype._establishContact = function (callback, rep, reps) {
  /*
  Args
    callback
      Callback function
    rep
      How many times have we tried?
    reps
      How many times until we give up

  Callback parameters
    err
      An error
    self
      A reference to the GPRS Object
  */

  var self = this;
  rep = rep || 0;
  reps = reps || 5;
  var patience = 1000;

  self._txrx('AT', patience, function checkIfWeContacted(err, data) {
    if (err && err.type === 'timeout' && rep < reps) {
      //  If we time out on AT, we're likely powered off
      //  Toggle the power and try again
      self.togglePower(function tryAgainAfterToggle() {
        self._establishContact(callback, rep + 1, reps);
      });
    } else if (!err) {
      self.emit('ready', data);
      if (callback) {
        callback(err, self);
      }
    } else {
      err = new Error('Could not connect to GPRS Module');
      setImmediate(function () {
        self.emit('error', err);
      });
      if (callback) {
        callback(err, self);
      }
    }
  }, [['AT', '\\x00AT', '\x00AT', 'OK'], ['OK'], 1]);
};

// Make UART calls to the SIM900. Use this function to expand the GPRS module's functionality by sending AT commands and recieving the SIM900's replies. If you implement something particularly useful, submit a pull request!
GPRS.prototype._txrx = function (message, patience, callback, alternate) {
  /*
  Every time we interact with the SIM900, it's through a series of UART calls and responses. This function makes that less painful. Note that this function requires that the SIM900 be configured to echo the commands it recieves (the default) in order for it to function properly.

  Args
    message
      String you're sending, ie 'AT'
    patience
      Milliseconds until we stop listening. It's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it.
    callback
      Callback function
    alternate
      An array of arrays of alternate starts and ends of reply post. Of the form [[s1, s2 ...], [e1, e2, ...]]. Used in place of traditional controls. If the third element of `alternate` is truth-y, then the values of `start` only need exist within the incoming data (good for posts with known headers but unknown bodies), as opposed to at the beginning of the packet.

 Callback parameters
    err
      Error object, if applicable
    recieved
      The reply recieved within the interval
  */

  var self = this;

  message  = message  || 'AT';
  patience = patience || 250;
  callback = callback || ( function (err, arg) {
    if (err) {
      debug('err:\n', err);
    } else {
      debug('reply:\n', arg);
    }
  });
  alternate = alternate || null;
  //  It's a virtue, but mostly the module won't work if you're impatient
  patience = Math.max(patience, 100);

  self.postmaster.send(message, patience, callback, alternate);
};

// Answer an incoming voice call
GPRS.prototype.answerCall = function (callback) {
  /*
  Args
    callback
      Callback function

  Callback parameters
    err
      Error
    data
      ['ATA', 'OK'] if all goes well
  */

  var self = this;
  self._txrx('ATA', 10000, function (err, data) {
    if (!err) {
      self.inACall = true;
    }
    callback(err, data);
  });
};

// Send a series of back-to-back messages recursively and do something with the final result. Other results, if not of the form [`messages[n]`, 'OK'] error out and pass false to the callback. The arguments `messages` and `patience` must be of the same length. Like `_txrx`, this function is also useful for expanding the module's functionality.
GPRS.prototype._chain = function (messages, patiences, replies, callback) {
  /*
  mesages
    An array of Strings to send as commands
  patiences
    An array of numbers; milliseconds to wait for each command to return
  replies
    An array of expected replies (arrays of strings). If any index is false-y, its reply simply must not error out.
  callback
    Callback function. Args come from the last function in the chain.

  Callback parameters
    err
      Error
    data
      What the final message command returned OR false if the replies were not as expected
  */

  var self = this;
  if (messages.length != patiences.length || messages.length != replies.length) {
    callback(new Error('Array lengths must match'), false);
  } else {
    //  A function to handle all commands before the final command
    var _intermediate = function (err, data) {
      var correct = !err;
      //  If the `replies` index is truth-y, check that the actual reply exactly matches the expected reply
      if (replies[0]) {
        for (var i = 0; i < data.length; i++) {
          //  Allow start of transmission packets to be valid
          correct = correct && ([data[i], '\\x00' + data[i], '\x00' + data[i]].indexOf(replies[0][i]) > -1);

          if (DEBUG) {
            console.log("data array", [data[i], '\\x00' + data[i], '\x00' + data[i]]);
            console.log("replies", replies);
            console.log("replies[0]", replies[0], replies[0][i]);
          }
        }
      }
      self.emit('_intermediate', correct);
    };
    //  Still more to do in the chain
    if (messages.length > 0) {
      var func = (messages.length === 1) ? callback:_intermediate;
      if (DEBUG) {
        console.log("_txrx sending", messages[0]);
      }
      self._txrx(messages[0], patiences[0], func, [[replies[0][0]], [replies[0][replies[0].length - 1]]]);
      //  If we have more to do before the base case, respond to the '_intermediate' event and keep going
      if (func === _intermediate) {
        self.once('_intermediate', function (correct) {
          if (correct) {
            self._chain(messages.slice(1), patiences.slice(1), replies.slice(1), callback);
          } else {
            self.postmaster.forceClear();
            if (callback) {
              callback(new Error('Chain broke on ' + messages[0]), false);
            }
          }
        });
      }
    }
  }
};

// Call the specified number (voice call, not data call)
GPRS.prototype.dial = function (number, callback) {
  /*
  Args
    number
      String representation of the number. Must be at least 10 digits.
    callback
      Callback function

  Callback parameters
    err
      Error, if applicable
    data
      [command echo, 'OK'] if all goes well
  */

  if (this.inACall) {
    callback(new Error('Currently in a call'), []);
  } else if (!number || !String(number).length) {
    callback(new Error('Did not specify a phone number'), []);
  } else {
    this.inACall = true;
                                  // hang up in a year
    this._txrx('ATD' + number + ';', 1000*60*60*24*365, function (err, data) {
      this.inACall = false;
      callback(err, data);
    });
  }
};

// Terminate a voice call
GPRS.prototype.hangUp = function (callback) {
  /*
  Args
    callback
      Callback function

  Callback parameters
    err
      Error
    data
      Reply upon hangup, hopefully ['ATH', 'OK']
  */

  var self = this;
  self._txrx('ATH', 100000, function (err, data) {
    self.inACall = false;
    callback(err, data);
  });
};

// Run through the `emissions` every time an unsolicited message comes in and emit events accordingly. There is probably a better way to do this, though, so consider the function unstable and pull requests welcome.
GPRS.prototype._checkEmissions = function () {
  /*
  Args
    none - see emitMe

  Callback parameters
    None, but packets are emitted
  */

  var self = this;
  self.postmaster.on('unsolicited', function (data) {
    var sent = false;
    //  Emit unsolicited packets that begin with specific characters as events
    self.emissions.forEach(function (beginning) {
      if (data.indexOf(beginning) === 0) {
        self.emit(beginning, data);
        sent = true;
      }
    });
    if (!sent) {
      self.emit('unsolicited', data);
    }
  });
};

// Many unsolicited events are very useful to the user, such as when an SMS is received or a call is pending. This function configures the module to emit events that beign with a specific String. There is probably a better way to do this, though, so consider the function unstable and pull requests welcome.
GPRS.prototype.emitMe = function (beginnings) {
  /*
  Args
    beginnings
      An array of Strings. If an unsolicited packet starts with one of them, emit it as an event by he same name

  Callback parameters
    None, but the events emitted will contain:
      data
        The text from the unsolicited packet
  */

  var self = this;
  beginnings.forEach(function (beginning) {
    self.emissions.push(beginning);
  });
  if (this.emissions.length === beginnings.length) {
    //  This is the first time this was called, you should start notifying
    this._checkEmissions();
  }
};

// Read the specified SMS. You'll want to parse the module's unsolicited packet to pull out the specific SMS number. Note that these numbers are nonvolatile and associated with the SIM card.
GPRS.prototype.readSMS = function (index, mode, remove, callback) {
  /*
  Args - two possibilities
    index
      The index of the message to read. Note that the SIM900 is 1-indexed, not 0-indexed.
    mode
      0 - Mark the message as read
      1 - Do not chage the status of the message
    remove - Optional
      0 - Keep the message on the simcard
      1 - Delete the message from the simcard once it is marked read.
    callback
      Callback function

  Callback parameters
    err
      Error
    message
      An array with
        0 - Command echo
        1 - Message information (read state, soure number, date, etc.)
        2 - Message text
        3 - 'OK'
      if successful
  */

  if (typeof callback === 'undefined') {
    callback = remove;
    remove = 0;
  }

  next = next || remove;

  var self = this;
  this._txrx('AT+CMGR=' + index + ',' + mode, 10000, function (err, message) {
    if (remove===1) {
      self._txrx('AT+CMGD=' + index, 10000);
    }
    callback(err, message);
  });
};

// Send an SMS to the specified number
GPRS.prototype.sendSMS = function (number, message, callback) {
  /*
  Args
    number
      String representation of the number. Must be at least 10 digits.
    message
      String to send
    callback
      Callback function

  Callback parameters
    err
      Error
    success
      Did it send properly? If yes, get back the ID number of the text in an array; if not, the error and -1 as the ID.
  */

  if (!number || !number.length) {
    callback(new Error('Did not specify a phone number'), null);
  } else {
    var self = this;
    message = message || 'text from a Tessel';
    var commands  = ['AT+CMGF=1', 'AT+CMGS="' + number + '"', message];
    var patiences = [2000, 5000, 5000];
    var replies = [['AT+CMGF=1', 'OK'], ['AT+CMGS="' + number + '"', '> '], [message, '> ']];

    self._chain(commands, patiences, replies, function (errr, data) {
      //  manually check the last one
      var correct = !errr && data[0] == message && data[1] == '> ';
      var id = -1;
      var err = errr || new Error('Unable to send SMS');
      if (correct) {
        self._txrx(new Buffer([0x1a]), 10000, function (err, data) {
          if (data && data[0] && data[0].indexOf('+CMGS: ') === 0 && data[1] == 'OK') {
            //  message sent!
            id = parseInt(data[0].slice(7), 10);
            err = null;
          }
          if (callback) {
            callback(err, [id]);
          }
        }, [['+CMGS: ', 'ERROR'], ['OK', 'ERROR'], 1]);
      } else if (callback) {
        callback(err, [id]);
      }
    });
  }
};

// Turn the module on or off by switching the power button (G3) electronically
GPRS.prototype.togglePower = function (callback) {
  var self = this;
  debug('toggling power...');
  self.power.high();
  setTimeout(function () {
    self.power.low();
    setTimeout(function () {
      self.power.high();
      setTimeout(function () {
        self.emit('powerToggled');
        debug('done toggling power');
        if (callback) {
          callback();
        }
      }, 5000);
    }, 1500);
  }, 100);
};

GPRS.prototype.disable = function () {
  this.uart.disable();
};

// Connect the GPRS module and establish contact with the SIM900
function use(hardware, callback) {
  /*
  Args
    hardware
      The Tessel port to use for the main GPRS hardware
    callback
      Callback frunction for once the module is set up

    Callback parameters
      err
        Error, if any, while connecting. Passes null if successful.
  */

  var radio = new GPRS(hardware);
  radio._establishContact(callback);
  return radio;
}

function debug (thing) {
  if (DEBUG) {
    console.log(thing);
  }
}

module.exports.GPRS = GPRS;
module.exports.use = use;
