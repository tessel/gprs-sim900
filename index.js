var tessel = require('tessel');
var hardware = tessel.port('d');

var uart = hardware.UART({baudrate: 19200});
var g3 = hardware.gpio(3)
          .output()
          .high();
var txCount = 0;
var rxCount = 0;

//////////////////////////////////////////////////////////////////////////////

function decode(array)
{
  var decoded = '';
  for (var i = 0; i < array.length; i++)
  {
    if (array[i] < 14)
      decoded += '\n'
    else
      decoded += String.fromCharCode(array[i]);
  }
  return decoded;
}

function printRecieved(r)
{
  message = decode(r)
  // if (message == '\n\nUNDER-VOLTAGE WARNNING\n\n')
  //   return
  console.log(rxCount, '\tRecieved:\n\t', message, '\n');
  rxCount++;
}

function send(cmd, verbose)
{
  verbose = verbose || 0;
  uart.write(cmd);
  if (verbose)
  {  
    console.log(txCount, '\tSent:\n\t', cmd);
    txCount++;
  }
}

function SMS(number, message)
{
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
            }, 2000);
          }, 750);
        }, 500);
      }, 500);
    }, 500);
}

function heyListen(reps)
{
  //  make sure the module is awake
  reps = reps || 3;
  for (var i = 0; i < reps; i++)
  {
    setTimeout(function(){
      send('AT', 1);
    }, 200 * (i + 1));
  }
}

function getNotificationSetting()
{
  send('AT+CGEREP?\r\n');
}

function setNotifications(mode, clearBuffer)
{
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

function getConnectionStatus()
{
  send('AT+CGATT?\r\n');
}

function setConnectionStatus(state)
{
  /*
  state
    0   off (disconnect)
    1   on (connect)
  */
  send('AT+CGATT=' + state + '\r\n');
}

function netlightGPRS(state)
{
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

function getNetworkInfo()
{
  //  cell network information
  send('AT+CNETSCAN\r\n');
}

function getWhitelist()
{
  //  who you can call/SMS
  send('AT+CWITELIST=?')
}

var lazyWhitelistIndex = 1;
function setWhitelist(mode, number, index)
{
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

function netlight(state)
{
  /* 
  turn it on or off

  state
    0   off
    1   on
  */

  state = state || 1;   //  on
  send('AT+CNETLIGHT=' + state + '\r\n');
}

function microphone(state)
{
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
////////////////////////////////////////////////////////////////////////////////

process.on('message', function (data) {
  // console.log(data.substring(1, data.length-1));
  send(data.substring(1, data.length - 1) + "\r\n");
});

console.log('waiting for messages...');

uart.on('data', function(bytes) {
  printRecieved(bytes);
});

console.log('gogogo!');
tessel.sleep(50);
g3.low();
tessel.sleep(1200);
g3.high();
tessel.sleep(3000);

heyListen();

tessel.sleep(100);

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
// send(characters);
// tessel.sleep(2000);

// characters = 'AT+CMGS="15555555555"\r\n'
// send(characters);
// tessel.sleep(2000);

// characters = 'text from a Tessel\r\n'
// send(characters);
// tessel.sleep(2000);

// characters = [0x1A]
// send(characters);




