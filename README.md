#GPRS/SIM
Driver for the gprs-sim900 Tessel GPRS/SIM module. The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#gprs).

If you run into any issues you can ask for support on the [GPRS Module Forums](http://forums.tessel.io/category/gprs).

## Installation
```sh
npm install gprs-sim900
```

###Configuring the GPRSModule
*Note:* The GPRS module must be configured properly in hardware in order for it to work. At the very least, make sure your Tessel and GPRS module look like the ones in the image below (plus a SIM card in the holder on the module, not pictured below). For a full overview of the GPRS module hardware, see [this section](./README.md#hardware-overviewsetup).

![GPRS module minimum configuration](https://s3.amazonaws.com/technicalmachine-assets/doc+pictures/gprs-hw-set.jpg)

#### HW Configuration Checklist

* GPRS power input select header (three-pin header in board corner) moved to '3.3V Tessel' (the two pins closest to board corner).
* Antenna plugged in
* SIM card in holder (not pictured above)

If the yellow `STATUS` light is on and the green `NETLIGHT` is blinking when the module is plugged in, then the module is configured correctly.

###Purchasing a SIM Card
For the purposes of the GPRS module, you will probably want a very basic SIM card. So simple that it can often be hard to convince the staff at many service providers to give you a plan that is that basic. We have found that it helps if you are very insistent about what features you want. 
For full text/call functionality with Tessel's GPRS module, you will want a sim card that
* is mini-SIM sized 
* has just text and calling functionality
* is pre-paid, not a monthly plan
* is unlocked

If you are clear and firm about your requirements when buying in store, you should not have any problem. You can also order a SIM card online from many providers. As for providers, we have had good luck with both AT&T and T-Mobile.

###A Note About SIM Cards
SIM cards can only hold 20-30 SMS messages at a time, depending on the sim card you have. If your SIM stops emiting events as expected, you can use the command line and the AT command manual to manually delete messages you do not want to keep on the SIM, or you can use the remove option included in the readSMS function to automatically delete messages after you read or log the messages.

###Example
```js
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
Use the GPRS module to send a text to a phone
number of your choice.
*********************************************/

var tessel = require('tessel');
var hardware = tessel.port['A'];
var gprslib = require('gprs-sim900');

var phoneNumber = '##########'; // Replace the #s with the String representation of the phone number, including country code (1 for USA)
var message = 'Text from a Tessel!';

//  Port, callback
var gprs = gprslib.use(hardware); 

gprs.on('ready', function() {
  console.log('GPRS module connected to Tessel. Searching for network...')
  //  Give it 10 more seconds to connect to the network, then try to send an SMS
  setTimeout(function() {
    console.log('Sending', message, 'to', phoneNumber, '...');
    // Send message
    gprs.sendSMS(phoneNumber, message, function smsCallback(err, data) {
      if (err) {
        return console.log(err);
      }
      var success = data[0] !== -1;
      console.log('Text sent:', success);
      if (success) {
        // If successful, log the number of the sent text
        console.log('GPRS Module sent text #', data[0]);
      }
    });
  }, 10000);
});

//  Emit unsolicited messages beginning with...
gprs.emitMe(['NORMAL POWER DOWN', 'RING', '+']);

gprs.on('NORMAL POWER DOWN', function powerDaemon () {
  gprs.emit('powered off');
  console.log('The GPRS Module is off now.');
});

gprs.on('RING', function someoneCalledUs () {
  var instructions = 'Someone\'s calling!\nType the command \'ATA\' to answer and \'ATH\' to hang up.\nYou\'ll need a mic and headset connected to talk and hear.\nIf you want to call someone, type \'ATD"[their 10+digit number]"\'.';
  console.log(instructions);
});

gprs.on('+', function handlePlus (data) {
  console.log('Got an unsolicited message that begins with a \'+\'! Data:', data);
});

//  Command the GPRS module via the command line
process.stdin.resume();
process.stdin.on('data', function (data) {
  data = String(data).replace(/[\r\n]*$/, '');  //  Removes the line endings
  console.log('got command', [data]);
  gprs._txrx(data, 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});

//  Handle errors
gprs.on('error', function (err) {
  console.log('Got an error of some kind:\n', err);
});

```

###Methods

&#x20;<a href="#api-gprs-answerCall-callback-err-data-Answer-an-incoming-voice-call" name="api-gprs-answerCall-callback-err-data-Answer-an-incoming-voice-call">#</a> gprs<b>.answerCall</b>( callback(err, data) )  
 Answer an incoming voice call.  

&#x20;<a href="#api-gprs-_chain-messages-patiences-replies-callback-err-data-Send-a-series-of-back-to-back-messages-recursively-and-do-something-with-the-final-result-Other-results-if-not-of-the-form-messages-n-OK-error-out-and-pass-false-to-the-callback-The-arguments-messages-and-patience-must-be-of-the-same-length-Like-_txrx-this-function-is-also-useful-for-expanding-the-module-s-functionality" name="api-gprs-_chain-messages-patiences-replies-callback-err-data-Send-a-series-of-back-to-back-messages-recursively-and-do-something-with-the-final-result-Other-results-if-not-of-the-form-messages-n-OK-error-out-and-pass-false-to-the-callback-The-arguments-messages-and-patience-must-be-of-the-same-length-Like-_txrx-this-function-is-also-useful-for-expanding-the-module-s-functionality">#</a> gprs<b>._chain</b>( messages, patiences, replies, callback(err, data) )  
 Send a series of back-to-back messages recursively and do something with the final result. Other results, if not of the form [messages[n], 'OK'] error out and pass false to the callback. The arguments messages and patience must be of the same length. Like _txrx, this function is also useful for expanding the module's functionality.  

&#x20;<a href="#api-gprs-dial-number-callback-err-data-Call-the-specified-number-voice-call-not-data-call" name="api-gprs-dial-number-callback-err-data-Call-the-specified-number-voice-call-not-data-call">#</a> gprs<b>.dial</b>( number, callback(err, data))  
Call the specified number (voice call, not data call ).  

&#x20;<a href="#api-gprs-hangUp-callback-err-data-Terminate-a-voice-call" name="api-gprs-hangUp-callback-err-data-Terminate-a-voice-call">#</a> gprs<b>.hangUp</b>( callback(err, data) )  
 Terminate a voice call.  

&#x20;<a href="#api-gprs-_checkEmissions-Run-through-the-emissions-every-time-an-unsolicited-message-comes-in-and-emit-events-accordingly-This-function-is-key-to-the-emitMe-method-There-is-probably-a-better-way-to-do-this-so-consider-the-function-unstable-and-pull-requests-welcome" name="api-gprs-_checkEmissions-Run-through-the-emissions-every-time-an-unsolicited-message-comes-in-and-emit-events-accordingly-This-function-is-key-to-the-emitMe-method-There-is-probably-a-better-way-to-do-this-so-consider-the-function-unstable-and-pull-requests-welcome">#</a> gprs<b>._checkEmissions</b>()  
 Run through the emissions every time an unsolicited message comes in and emit events accordingly. This function is key to the emitMe method. There is probably a better way to do this, so consider the function unstable and pull requests welcome.  

&#x20;<a href="#api-gprs-emitMe-beginnings-Many-unsolicited-events-are-very-useful-to-the-user-such-as-when-an-SMS-is-received-or-a-call-is-pending-Beginnings-is-an-array-of-strings-the-function-will-emit-unsolicited-messages-that-begin-with-these-strings-There-is-probably-a-better-way-to-do-this-so-consider-the-function-unstable-and-pull-requests-welcome" name="api-gprs-emitMe-beginnings-Many-unsolicited-events-are-very-useful-to-the-user-such-as-when-an-SMS-is-received-or-a-call-is-pending-Beginnings-is-an-array-of-strings-the-function-will-emit-unsolicited-messages-that-begin-with-these-strings-There-is-probably-a-better-way-to-do-this-so-consider-the-function-unstable-and-pull-requests-welcome">#</a> gprs<b>.emitMe</b>( beginnings )  
 Many unsolicited events are very useful to the user, such as when an SMS is received or a call is pending. Beginnings is an array of strings, the function will emit unsolicited messages that begin with these strings. There is probably a better way to do this, so consider the function unstable and pull requests welcome.  

&#x20;<a href="#api-gprs-readSMS-index-mode-callback-err-message-Read-the-index-specified-SMS-Mode-can-be-zero-and-make-the-message-as-read-or-one-and-not-change-the-status-of-the-message-The-callback-s-message-is-an-array-where-index-0-command-echo-1-message-information-read-state-source-number-data-2-message-text" name="api-gprs-readSMS-index-mode-callback-err-message-Read-the-index-specified-SMS-Mode-can-be-zero-and-make-the-message-as-read-or-one-and-not-change-the-status-of-the-message-The-callback-s-message-is-an-array-where-index-0-command-echo-1-message-information-read-state-source-number-data-2-message-text">#</a> gprs<b>.readSMS</b>( index, mode, remove, callback(err, message) )   
Read the index specified SMS. 
* Mode can be zero and make the message as read, or one and not change the status of the message. 
* Remove can be zero and keep the message on the sim card, or one and delete the message from the sim card. This is useful because sim cards can only hold around 20-30 messages at a time.
* The callback's message is an array where index 0: command echo, 1: message information (read state, source number, data), 2: message text.

&#x20;<a href="#api-gprs-sendSMS-number-message-callback-err-data-Send-an-SMS-to-the-specified-number" name="api-gprs-sendSMS-number-message-callback-err-data-Send-an-SMS-to-the-specified-number">#</a> gprs<b>.sendSMS</b>( number, message, callback(err, data) )  
 Send an SMS to the specified number.  

&#x20;<a href="#api-gprs-togglePower-callback-Turn-the-module-on-or-off" name="api-gprs-togglePower-callback-Turn-the-module-on-or-off">#</a> gprs<b>.togglePower</b>( callback() )  
 Turn the module on or off.  

###Events

&#x20;<a href="#api-gprs-on-powerToggled-callback-The-SIM900-has-been-turned-on-or-off" name="api-gprs-on-powerToggled-callback-The-SIM900-has-been-turned-on-or-off">#</a> gprs<b>.on</b>( 'powerToggled', callback() )  
The SIM900 has been turned on or off  

&#x20;<a href="#api-gprs-on-ready-callback-The-SIM900-is-ready-to-recieve-commands-Note-that-it-may-not-yet-be-connected-to-the-cell-network" name="api-gprs-on-ready-callback-The-SIM900-is-ready-to-recieve-commands-Note-that-it-may-not-yet-be-connected-to-the-cell-network">#</a> gprs<b>.on</b>( 'ready', callback() )  
 The SIM900 is ready to recieve commands. Note that it may not yet be connected to the cell network.  

&#x20;<a href="#api-gprs-on-unsolicited-callback-data" name="api-gprs-on-unsolicited-callback-data">#</a> gprs<b>.on</b>( 'unsolicited', callback(data) )  
 Called when the SIM900 send an unsolicited packet to the Tessel. data is the contents of the message.

&#x20;<a href="#api-gprs-on-_intermediate-callback-correct-Used-internally-for-_chain" name="api-gprs-on-_intermediate-callback-correct-Used-internally-for-_chain">#</a> gprs<b>.on</b>( '_intermediate', callback(correct) )  
 Used internally for _chain  

###GPRS sim-900 AT Commands

The GPRS module follows the sim-900 AT command structure. The full documentation can be found here: [SIM-900 AT Command Manual](http://wm.sim.com/upfile/2013424141114f.pdf).

You can control the GPRS module from the command line using the `command-line.js` example in the `examples/` directory. For example, you can check if your Tessel is connected to a network by running `AT+CGATT?`. 


You can enter these commands in your console if your Tessel is running a script that contains the following code.

```js
//  Command the GPRS module via the command line
process.stdin.resume();
process.stdin.on('data', function (data) {
  data = String(data).replace(/[\r\n]*$/, '');  //  Removes the line endings
  console.log('got command', [data]);
  gprs._txrx(data, 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});
```

####Useful Commands
* Retreive texts (SMS) by typing `AT+CMGR=<index of message>`
* Delete texts by typing  `AT+CMGD=<index of message>`
* Other commands can be found the the extensive command manual

###Hardware overview/setup
The GPRS module requries some setup in hardware in order to function properly. The image below highlights portions of the module users may need to configure.

![GPRS module with important parts highlighted](https://s3.amazonaws.com/technicalmachine-assets/doc+pictures/gprs.jpg)

Clockwise from the bottom left:

####SIM Card holder (orange)
Put a SIM card here if you want to make calls, send SMS, etc.. When correctly inserted, the notched corner of the card will be closest to the SIM900.

####Power and Reset buttons (dark blue)
The power button, also connected to GPIO3, can be used to turn the module on and off by pressing and holding the button for approximately one second. The Reset button can be used to force the module to undergo a hard reset.

####Expansion jumpers (light blue)
These three jumpers are what control whether or not the GPRS module uses both module ports. When the jumpers are connected (**not** as shown in the image), the module will use both ports.

Note that the GPRS module library currently does not currently support using both ports, so it is safest to leave the jumpers open. When the jumpers are open, another module can be plugged into the female header on the top edge of the module.

The pinout for the jumpers is as follows (top to bottom):

* **Ring indicator** - This signal is routed to GPIO3 on the second module port when connected. It is asserted low by the SIM900 module when a call comes in or when an SMS is recieved.

* **Debug TX** - This UART port talks at 115200 baud and is used only to upgrade the firmware on the SIM900 module. We haven't ever used it and doubt anyone else will, but better to break it out and not need it than the alternative.

* **Debug RX** - This UART port talks at 115200 baud and is used only to upgrade the firmware on the SIM900 module. We haven't ever used it and doubt anyone else will, but better to break it out and not need it than the alternative.

####Antenna connector (yellow)
This is where the antenna (black rectangle with a black wire whip) connects to the module.

####Input power select header (green)
This header controls which power source the GPRS module uses to power the SIM900 module. The module will not work unless the pins are bridged in one of two ways:

* When the jumper (not pictured) is bridging the *top* two pins, the module uses Tessel's 3.3 V rail to power the SIM900.
* When the jumper is positioned such that the *bottom* two pins are connected, the SIM900 is powered off external power and the regulator on the GPRS module itself, which is tuned to ~3.465 V. When available, external power should be used to power the module.

If the pins are not connected in either of those ways, the GPRS module will not turn on.

####External power input pins/connector (pink)
This black pin header and beige connector are where external power is applied to the GPRS module.

* The connectors' VIN and GND pins are tied together, so power need only be applied to one of the connectors.
* The input circuitry is rated to a  maximum of 17 V, a minimum of ~3.6 V.
* VIN (positive voltage) should be applied to the left pin of the black header or lower of the two pins on the gray connector. GND is the right pin on the black header and the upper pin of the  gray connector.

####Speaker/headset and microphone connectors (purple)
3.5 mm stereo jacks for audio in and out.

###License
MIT or Apache 2.0, at your option
