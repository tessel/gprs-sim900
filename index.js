var tessel = require('tessel');
var hardware = tessel.port('d');

var uart = new hardware.UART();

uart.baudrate = 19200;
