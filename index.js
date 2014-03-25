var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Packetizer = require('./packetizer.js');
var Postmaster = require('./postmaster.js');

function GPRS (hardware, secondaryHardware, baud) {
  /*
  constructor

  args
    hardware
      the tessel port to be used for priary communication
    secondaryHardware
      the additional port that can be used for debug purposes. not required. Typically, D/A will be primary, C/B will be secondary
    baud
      override the defualt baud rate of 115200 if necessary (for software UART)
  */
  var self = this;

  baud = baud || 9600;

  self.hardware = hardware;
  self.uart = new hardware.UART({baudrate: baud});
  self.power = hardware.gpio(3).high();
  self.packetizer = new Packetizer(self.uart);
  self.packetizer.packetize();
  self.inACall = false;
  //  the defaults are fine for most of Postmaster's args
  self.postmaster = new Postmaster(self.packetizer, ['OK', 'ERROR', '> ']);

  //  second debug port is optional and largely unnecessary
  // self.debugHardware = null;
  //  ring indicator can be useful, though
  // self.ringIndicator = null;
  // console.log('sech:\t', secondaryHardware);
  if (secondaryHardware) {//arguments.length > 2) {
    self.debugHardware = secondaryHardware;
    self.debugUART = secondaryHardware.UART({baudrate: 115200});
    self.ringIndicator = secondaryHardware.gpio(3);
    self.debugPacketizer = new Packetizer(self.debugUART);
    self.debugPacketizer.packetize();
  }
}

util.inherits(GPRS, EventEmitter)

function use(hardware, debug, baud, callback) {
  /*
  connect the gprs module and establish contact, then call the callback

  args
    hardware
      the tessel port to use for the main GPRS hardware
    debug
      the debug port, if any, to use (null most of the time)
    baud
      alternate baud rate for the UART
    callback
      what to call once you're connected to the module

    callback parameters
      err
        error, if any, while connecting
      contacted
        did we establish contact or not? t/f
  */
  callback = callback || function() {;};
  var radio = new GPRS(hardware, debug, baud);
  radio.establishContact(callback);
  return radio;
}

GPRS.prototype.txrx = function(message, patience, callback, alternate) {
  /*
  every time we interact with the sim900, it's through a series of uart calls and responses. this fucntion makes that less painful.

  args
    message
      string you're sending, ie 'AT'
    patience
      milliseconds until we stop listening. it's likely that the module is no longer responding to any single event if the reponse comes too much after we ping it.
    callback
      callback function
    alternate
      an array of arrays of alternate starts and ends of reply post. of the form [[s1, s2 ...],[e1, e2, ...]]. used in place of traditional controls.
      if the third element of alternate is truth-y, then the given start values only need exist within the incoming data (good for posts with known headers but unknown bodies) 

  callback parameters
    err
      error object
    recieved
      the reply recieved within the interval
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
    an array of Strings to send as commands
  patiences
    an array of numbers; how long to wait for each command to return
  replies
    an array of expected replies (arrays of strings). if any index is null, its reply simply must not error out
  callback
    what to call at the end with the final result

  callback parameters
    err
      error
    data
      what the final message comman returned OR false if the replies were not as expected
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
      console.log('sending ' + messages[0] + '...');

      var func = (messages.length === 1) ? callback:intermediate;

      self.txrx(messages[0], patiences[0], func, [[messages[0]], [replies[0][replies[0].length - 1]]]);

      if (func === intermediate) {
        self.once('intermediate', function(correct) {
          console.log('...got back the expected? ' + correct)
          if (correct) {
            console.log('starting new with', messages.slice(1), patiences.slice(1));
            self.txrxchain(messages.slice(1), patiences.slice(1), replies.slice(1), callback);
          }
          else {
            console.log('resetting the postmaster');
            self.postmaster.forceClear();
          }
        });
      }
    }
  }
}

GPRS.prototype.togglePower = function() {
  /*
  turn the module on or off by switching the power buton (G3) electronically
  */
  var self = this;
  self.power.high();
  setTimeout(function() {
    self.power.low();
    setTimeout(function() {
      self.power.high();
      setTimeout(function() {
        self.emit('powertoggled');
      }, 5000);
    }, 1000);
  }, 100);
}

GPRS.prototype.establishContact = function(callback, rep, reps) {
  /*
  make contact with the GPRS module, emit the 'ready' event

  args
    callback
      callback function
    rep
      how many times ahve we tried?
    reps
      how many times until we give up

  callback parameters
    err
      an error
    contacted
      true/false
  */

  var self = this;
  rep = rep || 0;
  reps = reps || 5;

  self.postmaster.send('AT', 1000, function(err, data) {
    //  too many tries = fail
    if (rep > reps) {
      // console.log('FAILED TO CONNECT TO MODULE');
      var mess = 'Failed to connect to module because it could not be powered on and contacted after ' + reps + ' attempt(s)'
      callback(new Error(mess), false);
    }
    //  if we timeout on an AT, we're probably powered off. toggle the power button and try again
    else if (err && err.message === 'no reply after 1000 ms to message "AT"') {
      self.togglePower();
      self.once('powertoggled', function() {
        self.establishContact(callback, rep + 1, reps);
      })
    }
    //this is where we want to be
    else if (data.length === 2 && data[0] === 'AT' && data[1] === 'OK') {
      setTimeout(function() {
        self.emit('ready');
      }, 1500);
      if (callback) {
        callback(null, true);
      }
    }
    else if (err && err.message != 'Postmaster busy') {
      // console.log('---> postmaster busy on rep', rep + '. [err]:\t', [err], '\n[data]:\t', [data], '\n\ttry again');
      self.establishContact(callback, rep + 1, reps);
    }
    //  this is just to be sure errors (with UART, presumably) get thrown properly
    else if (err) {
      // console.log('error of some kind: ' + err)
      callback(err, false);
    }
    else {
      // console.log('just try again, i guess')
      setTimeout(function() {
        self.establishContact(callback, rep + 1, reps);
      }, 1500);
    }
  });
}

GPRS.prototype.sendSMS = function(number, message, callback) {
  /*
  send an SMS to the specified number

  args
    number
      a String representation of the number. must be at least 10 digits.
    message
      a String to send
    callback
      callback function

  callback parameters
    err
      error
    success
      did it send properly? if yes, get back the ID number of the text, if not, the error and -1 as the ID

  we're trying to replicate this, modulo timeouts, and add error handling:

  setTimeout(function(){
    gprs.uart.write('AT\r\n');
    setTimeout(function(){
      gprs.uart.write('AT+CMGF=1\r\n');
      setTimeout(function(){
        gprs.uart.write('AT+CMGS="' + '##########' + '"\r\n');
        setTimeout(function(){
          gprs.uart.write('text from a tessel' + '\r\n');
          setTimeout(function(){
            // gprs.uart.write(0x1A);  //  no longer works with new UART
            gprs.uart.write(new Buffer([0x1a]));  // works with new UART
          }, 5000);//2000);
        }, 4000);//750);
      }, 2000);//500);
    }, 2000);//500);
  }, 2000);//500);
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
        // console.log('sent the send command, got back', err, data);
        var id = -1;
        var err = err || new Error('Unable to send SMS');
        // if all goes well, err=undefined and data = ['+CMGS: ###', 'OK']
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
  call the specified number

  args
    number
      a string representation of the number. must be at least 10 digits
    callback
      callback function

  callback parameters
    err
      error, if applicable
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
  terminate a vouce call

  args
    callback
      a callback function

  callback parameters
    err
      error
    data
      reply upon hangup
  */
  this.txrx('ATH', 100000, callback);
}

GPRS.prototype.answerCall = function(callback) {
  /*
  answer an incoming voice call

  args
    callback
      callback function

  callback parameters
    call
      a call object
  */

  var self = this;
}

GPRS.prototype.ignoreCall = function(callback) {
  /*
  ignore an incoming voice call

  args
    callback
      callback function

  callback parameters
    none
  */

  self.postmaster.send('ATH')
}

GPRS.prototype.readSMS = function(index, mode, callback) {
  /*
  read the specified SMS

  args - two possibilities
    index
      the index of the message to read. if not specified, the newest message is read. note that these are 1-indexed, not 0-indexed.
    mode
      0 - mark the message as read
      1 - do not chage the status of the message
    callback
      callback function

  callback parameters
    err
      error
    message
      an array with
        0 - command echo
        1 - message information (read state, soure number, date, etc.)
        2 - message text
        3 - 'OK'
      if successful
  */

  this.txrx('AT+CMGR=' + index + ',' + mode, 10000, callback);
}


module.exports.GPRS = GPRS;
module.exports.use = use;
module.exports.txrx = txrx;
module.exports.establishContact = establishContact;
module.exports.sendSMS = sendSMS;
module.exports.dial = dial;
module.exports.answerCall = answerCall;
module.exports.ignoreCall = ignoreCall;
module.exports.readSMS = readSMS;