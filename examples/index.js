var tessel = require('tessel');
var hardware = tessel.port('d');

var uart = hardware.UART({baudrate: 19200});
var g3 = hardware.gpio(3)
          .output()
          .high();
var txCount = 0;
var rxCount = 0;

var messages = [];
var previousCharacter = '';
var latestMessage = '';

//////////////////////////////////////////////////////////////////////////////

function decode(array) {
  var decoded = '';
  for (var i = 0; i < array.length; i++)
  {
    if (array[i] < 14) // not technically always true
      decoded += '\n';
    else
      decoded += String.fromCharCode(array[i]);
  }
  return decoded; 
}

function printRecieved(r) {
  message = decode(r)
  // if (message == '\n\nUNDER-VOLTAGE WARNNING\n\n')
  //   return
  console.log(rxCount, '\tRecieved:\n\t', message, '\n');
  rxCount++;
}

function printMessage(message) {
  // message = decode(r)
  // if (message == '\n\nUNDER-VOLTAGE WARNNING\n\n')
  //   return
  console.log(rxCount, '\tRecieved:\n\t', message, '\n');
  rxCount++;
}

function send(cmd, verbose) {
  verbose = verbose || 0;
  uart.write(cmd);
  if (verbose)
  {  
    console.log(txCount, '\tSent:\n\t', cmd);
    txCount++;
  }
}

function SMS(number, message) {
  number = String(number) || '15555555555';   //  sorry, not sorry, Jia
  message = message || 'text from a Tessel';

  setTimeout(function(){
    send('AT\r\n');
    setTimeout(function(){
      send('AT+CMGF=1\r\n');
      setTimeout(function(){
        send('AT+CMGS="' + number + '"\r\n');
        setTimeout(function(){
          send(message + '\r\n');
          setTimeout(function(){
            send([0x1A]);
            }, 3000);//2000);
          }, 2000);//750);
        }, 2000);//500);
      }, 2000);//500);
    }, 2000);//500);
}

function heyListen(reps) {
  //  make sure the module is awake
  reps = reps || 3;
  for (var i = 0; i < reps; i++)
  {
    setTimeout(function(){
      send('AT', 1);
    }, 500 * (i + 1));
  }
}

function getNotificationSetting() {
  send('AT+CGEREP?\r\n');
}

function setNotifications(mode, clearBuffer) {
  /*
  mode
    0   buffer them
    1   discard
    2   buffer when you're in the middle of something, send when you're done

  clearBuffer
    0   keep the buffer
    1   flush
  */
  mode = mode || 0;                 //  off
  clearBuffer = clearBuffer || 0;   //  don't clear

  send('AT+CGEREP=' + mode + ',' + clearBuffer + '\r\n');
}

function getConnectionStatus() {
  send('AT+CGATT?\r\n');
}

function setConnectionStatus(state) {
  /*
  state
    0   off (disconnect)
    1   on (connect)
  */
  send('AT+CGATT=' + state + '\r\n');
}

function netlightGPRS(state) {
  /*
  bind the netlight's flashing to the GPRS status

  state
    0   disable
    1   enable
    ?   what my state again?
  */
  state = state || '?';

  if (state == '?')           //  read
    send('AT+CSGS?');
  else                        //  write
    send('AT+CSGS=' + state);
}

function getNetworkInfo() {
  //  cell network information
  send('AT+CNETSCAN\r\n');
}

function getWhitelist() {
  //  who you can call/SMS
  send('AT+CWITELIST=?')
}

var lazyWhitelistIndex = 1;
function setWhitelist(mode, number, index) {
  /*
  enable/disable the whitelist and/or add/remove a number to/from it

  mode
    0   off
    1   on
  number
    [some 10-digit number/string]
  index
    0   remove from the list
    1   add tot he list
  */
  mode = mode || 1;                     //  enable the whitelist
  number = number || 'X';               //  dummy
  index = index || lazyWhitelistIndex;  //  be lazy and let it keep track

  if (number != 'X')
    send('AT+CWITELIST=' + mode);
  else
  {
    send('AT+CWITELIST=' + mode + ',' + number + ',' + index);
    if (index == lazyWhitelistIndex)
      lazyWhitelistIndex ++;
  }
}

function netlight(state) {
  /* 
  turn it on or off

  state
    0   off
    1   on
  */

  state = state || 1;   //  on
  send('AT+CNETLIGHT=' + state + '\r\n');
}

function microphone(state) {
  /* 
  turn it on or off

  state
    0   mic on
    1   mic off
    ?   what stae am I in?
  */

  state = state || '?';   //  what state am I in?
  if (state != '?')
    state = '=' + String(state);
  send('AT+CEXTERNTONE' + state + '\r\n');
}

function setNetlightTiming(mode, on, off) {
  /*
  don't like the default blinks? OK.

  defaults:
    1,53,790
    2,53,2990
    3,53,287

  mode
    1   when the module is disconnected
    2   when the module is connected
    3   when in PPP comms
    ?   get the state
  on
    [40 - 65535]  how long you want it on, in ms
  off
    [40 - 65535]  how long you want it off, in ms
  */

  mode = mode || '?';

  if (mode == '?')      //  read
    send('AT+SLEDS?\r\n');
  else                  //  write
  {  
    on = on || 53; 
    off = off || [790, 2990, 287][mode];
    send('AT+SLEDS=' + mode + ',' + on + ',' + off + '\r\n');
  }
}

function rejectMode(mode) {
  /*
  do you want to answer incoming calls?

  mode
    0   enable
    1   fobid all
    2   forbid voice, enable CSD
    ?   get current state
  */

  mode = mode || '?';

  if (mode == '?')      //  read
    send('AT+GSMBUSY?\r\n');
  else                  //  write
    send('AT+GSMBUSY=' + mode + '\r\n');
}

function voiceCoding(mode) {
  /*
  Get/set voice coding type? Not toatally sure what these do...

  mode
    0   FR
    1   EFR/FR
    2   HR/FR
    3   FR/HR
    4   HR/EFR
    5   EFR/HR
    6   AMR-FR/EFR,AMHR-HR
    7   AMR-FR/EFR,AMR-HR/HR
    8   AMR-HR/HR/AMR-FR/EFR
    9   AMR-HR/AMR-FR/EFR
    10  AMR-HR/AMR-FR/FR
    11  AMR-HR/HR/AMR-FR
    12  AMR-FR/AMR-HR
    13  AMR-FR/FR/AMR-HR
    14  AMR-FR/FR/AMR-HR/HR
    15  AMR-FR/EFR/FR/AMR-HR/HR
    16  AMR-HR/AMR-FR/EFR/FR/HR
    17  AMR-FR/AMR-HR/EFR/FR/HR
    ?   get current state
  */

  mode = mode || '?';

  if (mode == '?')      //  read
    send('AT+SVR?\r\n');
  else                  //  write
    send('AT+SVR=' + mode + '\r\n');
}

function audioSwitch(mode) {
  /*
  control automatic audio channel switching

  mode
    0   disable + disable headset HOOK function
    1   enable + enable headset HOOK function
    2   disable + enable headset HOOK function
    ?   get current state
  */

  mode = mode || '?';

  if (mode == '?')      //  read
    send('AT+CAAS?\r\n');
  else                  //  write
    send('AT+CAAS=' + mode + '\r\n');
}


////////////////////////////////////////////////////////////////////////////////

var led1 = tessel.led(1).output().high();
var led2 = tessel.led(2).output().low();


setInterval(function () {
  led1.toggle();
  led2.toggle();
}, 250);


process.on('message', function (data) {
  // console.log(data.substring(1, data.length-1));
  send(data.substring(1, data.length - 1) + "\r\n");
});

console.log('waiting for messages...');




// original implementation is too fast... buffer doesn't build up on its own
// uart.on('data', function(bytes) {
//   printRecieved(bytes);
// });

uart.on('data', function(bytes) {
  for (var i = 0; i < bytes.length; i++)
  {
    var thing = decode([bytes[i]]);
    // console.log([thing]);
    if (thing == '\n' && previousCharacter == '\n')
    {
      //  new "packet"
      // console.log(latestMessage);
      printMessage(latestMessage);
      messages.push(latestMessage);
      latestMessage = '';
      previousCharacter = '';
    }
    else
    {
      latestMessage += thing;
      previousCharacter = thing;
    }
  }

  // bytes.forEach(function(thing)
  // {
  //   var decoded = decode([thing]);
  //   console.log(decoded);
  //   // if (decoded == '\n' )
  // });
});





console.log('gogogo!');
tessel.sleep(50);
// g3.low();
// tessel.sleep(1200);
// g3.high();
// tessel.sleep(3000);

heyListen();

tessel.sleep(100);

// setTimeout(function () {
//   SMS(15555555555, "test") 
//   }, 25000);

// setInterval(function(){
//   send('AT+CMGR=1,1\r\n');
// }, 4000);

// setInterval(function(){
//   send('AT+CMGR=2,1\r\n');
// }, 5000);


// setInterval(function(){
//   send('AT+CMGR=3,1\r\n');
// }, 6000);

// setInterval(function(){
//   send('AT+CMGR=4,1\r\n');
// }, 7000);

// SMS(phone#,'messagetext');







//    for history's sake

// THIS BLOCK WORKED
// var characters = 'AT\r\n'
// send(characters);
// tessel.sleep(2000);

// characters = 'AT+CMGF=1\r\n'
// send(characters);x
// tessel.sleep(2000);

// characters = 'AT+CMGS="15555555555"\r\n'
// send(characters);
// tessel.sleep(2000);

// characters = 'text from a Tessel\r\n'
// send(characters);
// tessel.sleep(2000);

// characters = [0x1A]
// send(characters);




