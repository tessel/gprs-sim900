/*
At the center of Tessel's GPRS Module lies the SIM900, documentation for which, including a full list of commands, can be found at: http://wm.sim.com/producten.aspx?id=1019
The full AT command manual is here: http://wm.sim.com/downloaden.aspx?id=2986
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');
var Postmaster = require('./postmaster.js');


function GPRS (hardware, secondaryHardware, baud) {
  /*
  Constructor

  Args
    hardware
      The Tessel port to be used for priary communication
    secondaryHardware
      The additional port that can be used for debug purposes. not required. Typically, D/A will be primary, C/B will be secondary
    baud
      Override the defualt baud rate of 115200 if necessary (for software UART)
  */

  var self = this;

  baud = baud || 9600;

  self.hardware = hardware;
  self.uart = new hardware.UART({baudrate: baud});
  self.power = hardware.gpio(3).high();
  self.packetizer = new Packetizer(self.uart);
  self.packetizer.packetize();
  self.inACall = false;
  self.notificationCallbacks = {};
  //  the defaults are fine for most of Postmaster's args
  self.postmaster = new Postmaster(self.packetizer, ['OK', 'ERROR', '> ']);

  //  second debug port is optional and largely unnecessary
  if (secondaryHardware) {
    self.debugHardware = secondaryHardware;
    self.debugUART = secondaryHardware.UART({baudrate: 115200});
    self.ringIndicator = secondaryHardware.gpio(3);
    self.debugPacketizer = new Packetizer(self.debugUART);
    self.debugPacketizer.packetize();
  }
}

util.inherits(GPRS, EventEmitter);

function use(hardware, debug, baud, callback) {
  /*
  Connect the GPRS module and establish contact with the SIM900

  Args
    hardware
      The Tessel port to use for the main GPRS hardware
    debug
      The debug port, if any, to use (null most of the time).
    baud
      Alternate baud rate for the UART
    callback
      Callback frunction for once the module is set up

    Callback parameters
      err
        Error, if any, while connecting. Passes null if successful.
  */

  callback = callback || function() {;};
  var radio = new GPRS(hardware, debug, baud);
  radio.establishContact(callback);
  return radio;
}

GPRS.prototype.txrx = function(message, patience, callback, alternate) {
  /*
  every time we interact with the sim900, it's through a series of uart calls and responses. this fucntion makes that less painful.

  Args
    message
      Atring you're sending, ie 'AT'
    patience
      Milliseconds until we stop listening. It's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it.
    callback
      Callback function
    alternate
      An array of arrays of alternate starts and ends of reply post. of the form [[s1, s2 ...], [e1, e2, ...]]. Used in place of traditional controls.
      If the third element of alternate is truth-y, then the given start values only need exist within the incoming data (good for posts with known headers but unknown bodies).

 Callback parameters
    err
      Error object, if applicable
    recieved
      Ehe reply recieved within the interval
  */
  
  var self = this;

  message  = message  || 'AT';
  patience = patience || 250;
  callback = callback || ( function(err, arg) { 
    if (err) {
      console.log('err:\n', err);
    }
    else {
      console.log('reply:\n', arg);
    };
  });
  alternate = alternate || null;
  //  it's a virtue, but mostly the module won't work if you're impatient
  patience = Math.max(patience, 100);

  self.postmaster.send(message, patience, callback, alternate);
}

GPRS.prototype.txrxchain = function(messages, patiences, replies, callback) {
  /*
  send a series of back-to-back messages recursively, do something with the final result. other results, if not of the form [<message>, <OK>] error out and pass false to the callback. args messages and patience must be of the same length.

  mesages
    An array of Strings to send as commands
  patiences
    An array of numbers; how long to wait for each command to return
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
    console.log('length mismatch');
    callback(new Error('array lengths must match'), false);
  }
  else {
    var intermediate = function(err, data) {
      console.log('startng intermediate. e, r:', err, data)
      var correct = !err;
      if (replies[0]) {
        for (var i = 0; i < data.length; i++) {
          console.log('di', data[i], 'r0i', replies[0][i])
          correct = correct && data[i] == replies[0][i];
        }
      }
      self.emit('intermediate', correct);
    }
    //  not yet to the callback
    if (messages.length > 0) {
      var func = (messages.length === 1) ? callback:intermediate;
      self.txrx(messages[0], patiences[0], func, [[messages[0]], [replies[0][replies[0].length - 1]]]);
      if (func === intermediate) {
        self.once('intermediate', function(correct) {
          if (correct) {
            self.txrxchain(messages.slice(1), patiences.slice(1), replies.slice(1), callback);
          }
          else {
            self.postmaster.forceClear();
          }
        });
      }
    }
  }
}

GPRS.prototype.togglePower = function(callback) {
  /*
  Turn the module on or off by switching the power buton (G3) electronically
  */

  var self = this;
  self.power.high();
  setTimeout(function() {
    self.power.low();
    setTimeout(function() {
      self.power.high();
      setTimeout(function() {
        self.emit('powertoggled');
        if (callback) {
          callback();
        }
      }, 5000);
    }, 1000);
  }, 100);
}

GPRS.prototype.establishContact = function(callback, rep, reps) {
  /*
  Make contact with the GPRS module, emit the 'ready' event

  Args
    callback
      Callback function
    rep
      How many times ahve we tried?
    reps
      How many times until we give up

  Callback parameters
    err
      An error
    contacted
      true/false
  */

  var self = this;
  rep = rep || 0;
  reps = reps || 5;

  self.postmaster.send('AT', 1000, function(err, data) {
    //  too many tries = fail
    if (rep > reps) {
      var mess = 'Failed to connect to module because it could not be powered on and contacted after ' + reps + ' attempt(s)'
      callback(new Error(mess));
    }
    //  if we timeout on an AT, we're probably powered off. toggle the power button and try again
    else if (err && err.message === 'no reply after 1000 ms to message "AT"') {
      self.togglePower();
      self.once('powertoggled', function() {
        self.establishContact(callback, rep + 1, reps);
      });
    }
    //this is where we want to be
    else if (!err && data.length === 2 && data[0] === 'AT' && data[1] === 'OK') {
      setTimeout(function() {
        self.emit('ready');
      }, 1500);
      if (callback) {
        callback(null);
      }
    }
    else if (err && err.message != 'Postmaster busy') {
      self.establishContact(callback, rep + 1, reps);
    }
    //  this is just to be sure errors (with UART, presumably) get thrown properly
    else if (err) {
      callback(err);
    }
    else {
      setTimeout(function() {
        self.establishContact(callback, rep + 1, reps);
      }, 1500);
    }
  });
}

GPRS.prototype.sendSMS = function(number, message, callback) {
  /*
  Send an SMS to the specified number

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
      Did it send properly? If yes, get back the ID number of the text, if not, the error and -1 as the ID.
  */

  var self = this;
  number = String(number) || '15555555555';
  message = message || 'text from a Tessel';

  commands  = ['AT+CMGF=1', 'AT+CMGS="' + number + '"', message];
  patiences = [2000, 5000, 5000];
  replies = [['AT+CMGF=1', 'OK'], ['AT+CMGS="' + number + '"', '> '], [message, '> ']];

  self.txrxchain(commands, patiences, replies, function(err, data) {
    //  manually check the last one
    var correct = !err && data[0] == message && data[1] == '> ';
    if (correct) {
      self.txrx(new Buffer([0x1a]), 10000, function(err, data) {
        var id = -1;
        var err = err || new Error('Unable to send SMS');
        if (data[0].indexOf('+CMGS: ') === 0 && data[1] == 'OK') {
          //  message sent!
          id = parseInt(data[0].slice(7), 10);
          err = null;
        }
        callback(err, id);
      }, [['+CMGS: ', 'ERROR'], ['OK', 'ERROR'], 1]);
    }
  });
}

GPRS.prototype.dial = function(number, callback) {
  /*
  Call the specified number (voice call, not data call)

  Args
    number
      String representation of the number. Must be at least 10 digits
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
  }
  else if (String(number).length < 10) {
    callback(new Error('Number must be at least 10 digits'), []);
  }
  else {
    this.inACall = true;
                                //  hang up in a year
    this.txrx('ATD' + number + ';', 1000*60*60*24*365, function(err, data) {
      this.inACall = false;
      callback(err, data);
    });
  }
}

GPRS.prototype.hangUp = function(callback) {
  /*
  terminate a voice call

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
  this.txrx('ATH', 100000, function(err, data) {
    self.inACall = false;
    callback(err, data);
  });
}

GPRS.prototype.answerCall = function(callback) {
  /*
  answer an incoming voice call

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
  self.txrx('ATA', 10000, function(err, data) {
    if (!err) {
      self.inACall = true;
    }
    callback(err, data);
  });
}

GPRS.prototype.readSMS = function(index, mode, callback) {
  /*
  Read the specified SMS

  args - two possibilities
    index
      The index of the message to read. If not specified, the newest message is read. Note that the SIM900 is 1-indexed, not 0-indexed.
    mode
      0 - Mark the message as read
      1 - Do not chage the status of the message
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

  this.txrx('AT+CMGR=' + index + ',' + mode, 10000, callback);
}

GPRS.prototype.notifyOn = function(pairs) {
  /*
  Many unsolicited events are very useful to the user, such as when an SMS is recieved or a call is pending.

  Args
    pairs
      An Object which maps unsolicited message header Strings (e.g. '+CMT' = text message recieved) to callback functions.

 Ccallback parameters
    None, but the given functions in pairs should accept the follwing arguments:
      err
        An error, if applicable
      data
        The text from the unsolicited packet
  */

  var self = this;
  if (Object.keys(self.notificationCallbacks).length === 0) {
    //  this is the first time this was called, you shaould start notifying
    self.notify();
  }
  Object.keys(pairs).forEach(function(newKey) {
    //  note that this overwrites whatever may have been there
    self.notificationCallbacks[newKey] = pairs[newKey];
  });
}

GPRS.prototype.notify = function() {
  /*
  Run through the notificationCallbacks every time an unsolicited message comes in and call the related functions

  Args
    None (see notifyOn)

  Callback parameters
    None, but err and data are passed to the callbacks in notificationCallbacks
  */

  var self = this;
  self.postmaster.on('unsolicited', function(err, data) {
    //  on every unsolicited event
    Object.keys(self.notificationCallbacks).forEach(function(key) {
      if (data.indexOf(key) === 0) { //callThisFunction) {
        self.notificationCallbacks[key](err, data);
      }
    });
  });
}


module.exports.GPRS = GPRS;
module.exports.use = use;
module.exports.txrx = txrx;
module.exports.txrxchain = txrxchain;
module.exports.togglePower = togglePower;
module.exports.establishContact = establishContact;
module.exports.sendSMS = sendSMS;
module.exports.dial = dial;
module.exports.hangUp = hangUp;
module.exports.answerCall = answerCall;
module.exports.readSMS = readSMS;
module.exports.notifyOn = notifyOn;
module.exports.notify = notify;