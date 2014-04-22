#GPRS/SIM
Driver for the gprs-sim900 Tessel GPRS/SIM module ([SIM900](ftp://imall.iteadstudio.com/IM120417009_IComSat/DOC_SIM900_Hardware%20Design_V2.00.pdf)).

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

## Installation
```sh
npm install gprs-sim900
```
## Example
```js
exactly the contents of examples/gprs.js but the importation line should refer to the node module
```

## License

MIT
