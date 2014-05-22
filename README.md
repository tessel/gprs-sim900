#GPRS/SIM
Driver for the gprs-sim900 Tessel GPRS/SIM module ([SIM900](ftp://imall.iteadstudio.com/IM120417009_IComSat/DOC_SIM900_Hardware%20Design_V2.00.pdf)).

## Installation
```sh
npm install gprs-sim900
```
## Example
```js
var tessel = require('tessel');
var hardware = tessel.port('A');

var gprs = require('../').use(hardware);

gprs.on('ready', function() {
  //  Give it 30 more seconds to connect to the network, then try to send an SMS
  setTimeout(function() {
    var smsCallback = function(err, data) {
      console.log('Did we send the text?\t', data[0] !== -1);
      if (data[0] !== -1) {
        console.log('Reply from the SIM900 (text number):\t', data);
      }
    };
    //  Replce the #s with the String representation of 10+ digit number
    //  (hint: the U.S.'s country code is 1)
    console.log('Trying to send an SMS now');
    gprs.sendSMS('##########', 'Text from a Tessel!', smsCallback);
  }, 30000);
});

//  Emit unsolicited messages beginning with...
gprs.emitMe(['+', 'NORMAL POWER DOWN']);

gprs.on('+', function handlePlus (data) {
  console.log('\nGot an unsolicited message!\n\t', data);
});

gprs.on('NORMAL POWER DOWN', function powerDaemon () {
  gprs.emit('powered off');
  console.log('The GPRS Module is off now.');
});

//  Command the GPRS module via the command line with `tessel run gprs.js -m`
process.on('message', function (data) {
  console.log('got command', [data.slice(1, data.length - 1)]);
  gprs._txrx(data.slice(1, data.length - 1), 10000, function(err, data) {
    console.log('\nreply:\nerr:\t', err, '\ndata:');
    data.forEach(function(d) {
      console.log('\t' + d);
    });
    console.log('');
  });
});

// Do some blinky to show we're alive
var led1 = tessel.led(1).output().high();
var led2 = tessel.led(2).output().low();
setInterval(function () {
  led1.toggle();
  led2.toggle();
}, 150);

```
## Methods

##### * `gprs.answerCall(callback(err, data))` Answer an incoming voice call.

##### * `gprs._chain(messages, patiences, replies, callback(err, data))` Send a series of back-to-back messages recursively and do something with the final result. Other results, if not of the form [`messages[n]`, 'OK'] error out and pass false to the callback. The arguments `messages` and `patience` must be of the same length. Like `_txrx`, this function is also useful for expanding the module's functionality.

##### * `gprs.dial(number, callback(err, data))` Call the specified number (voice call, not data call).

##### * `gprs.hangUp(callback(err, data))` Terminate a voice call.

##### * `gprs._checkEmissions()` Run through the `emissions` every time an unsolicited message comes in and emit events accordingly. There is probably a better way to do this, though, so consider the function unstable and pull requests welcome.

##### * `gprs.emitMe(beginnings)` Many unsolicited events are very useful to the user, such as when an SMS is received or a call is pending. This function configures the module to emit events that beign with a specific String. There is probably a better way to do this, though, so consider the function unstable and pull requests welcome.

##### * `gprs.readSMS(index, mode, callback(err, message))` Read the specified SMS. You'll want to parse the module's unsolicited packet to pull out the specific SMS number. Note that these numbers are nonvolatile and associated with the SIM card. 

##### * `gprs.sendSMS(number, message, callback(err, data))` Send an SMS to the specified number.

##### * `gprs.togglePower(callback())` Turn the module on or off.

## Events

##### * `gprs.on('powerToggled', callback())` The SIM900 has been turned on or off

##### * `gprs.on('ready', callback())` The SIM900 is ready to recieve commands. Note that it may not yet be connected to the cell network. 

##### * `gprs.on('_intermediate', callback(correct))` Used internally for `_chain`

## Hardware overview/setup

The GPRS module requries some setup in hardware in order to function properly. The image below highlights portions of the module users may need to configure.

![GPRS module with important parts highlighted](https://s3.amazonaws.com/technicalmachine-assets/doc+pictures/gprs.jpg)

Clockwise from the bottom left:

### SIM Card holder (orange)

Put a SIM card here if you want to make calls, send SMS, etc.. When correctly inserted, the notched corner of the card will be closest to the SIM900.

### Power and Reset buttons (dark blue)

The power button, also connected to GPIO3, can be used to turn the module on and off by pressing and holding the button for approximately one second. The Reset button can be used to force the module to undergo a hard reset.

### Expansion jumpers (light blue)

These three jumpers are what control whether or not the GPRS module uses both module ports. When the jumpers are connected (**not** as shown in the image), the module will use both ports.

Note that the GPRS module library currently does not currently support using both ports, so it is safest to leave the jumpers open. When the jumpers are open, another module can be plugged into the female header on the top edge of the module.

The pinout for the jumpers is as follows (top to bottom):

* **Ring indicator** - This signal is routed to GPIO3 on the second module port when connected. It is asserted low by the SIM900 module when a call comes in or when an SMS is recieved.

* **Debug TX** - This UART port talks at 115200 baud and is used only to upgrade the firmware on the SIM900 module. We haven't ever used it and doubt anyone else will, but better to break it out and not need it than the alternative.

* **Debug RX** - This UART port talks at 115200 baud and is used only to upgrade the firmware on the SIM900 module. We haven't ever used it and doubt anyone else will, but better to break it out and not need it than the alternative.

### Antenna connector (yellow)

This is where the antenna (black rectangle with a black wire whip) connects to the module.

### Input power select header (green)

This header controls which power source the GPRS module uses to power the SIM900 module. The module will not work unless the pins are bridged in one of two ways:

* When the jumper (not pictured) is bridging the *top* two pins, the module uses Tessel's 3.3 V rail to power the SIM900.
* When the jumper is positioned such that the *bottom* two pins are connected, the SIM900 is powered off external power and the regulator on the GPRS module itself, which is tuned to ~3.465 V. When available, external power should be used to power the module.

If the pins are not connected in either of those ways, the GPRS module will not turn on.

### External power input pins/connector (pink)

This black pin header and gray connector are where external power is applied to the GPRS module.

* The connectors' VIN and GND pins are tied together, so power need only be applied to one of the connectors.
* The input circuitry is rated to a  maximum of 17 V, a minimum of ~3.6 V.
* VIN (positive voltage) should be applied to the left pin of the black header or lower of the two pins on the gray connector. GND is the right pin on the black header and the upper pin of the  gray connector.

### Speaker/headset and microphone connectors (purple)

3.5 mm stereo jacks for audio in and out.


## License

MIT
APACHE
