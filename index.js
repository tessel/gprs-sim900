var tessel = require('tessel');
var hardware = tessel.port('d');

var uart = hardware.UART({baudrate: 19200});
var g3 = hardware.gpio(3)
          .output()
          .high();
var sleepTime = 2000;
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
  if (message == '\n\nUNDER-VOLTAGE WARNNING\n\n')
    return
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
  number = String(number) || '15555555555';
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
  reps = reps || 3;
  for (var i = 0; i < reps; i++)
  {
    setTimeout(function(){
      send('AT');
    }, 200 * i);
  }
}

////////////////////////////////////////////////////////////////////////////////

uart.on('data', function(bytes) {
  tessel.sleep(1);
  printRecieved(bytes);
});

// tessel.sleep(10000);
console.log('gogogo!');

heyListen();









//    for history's sake

// THIS BLOCK WORKED
// var characters = 'AT\r\n'
// send(characters);
// tessel.sleep(sleepTime);

// characters = 'AT+CMGF=1\r\n'
// send(characters);
// tessel.sleep(sleepTime);

// characters = 'AT+CMGS="15555555555"\r\n'
// send(characters);
// tessel.sleep(sleepTime);

// characters = 'text from a Tessel\r\n'
// send(characters);
// tessel.sleep(sleepTime);

// characters = [0x1A]
// send(characters);




