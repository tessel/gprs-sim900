var tessel = require('tessel');
var hardware = tessel.port('d');

var uart = hardware.UART({baudrate: 19200});
var g3 = hardware.gpio(3)
          .output()
          .high();
var sleepTime = 2000;
var txCount = 0;
var rxCount = 0;
// g3.low();
// tessel.sleep(sleepTime);
// g3.high();
// tessel.sleep(sleepTime);

////////////////////////////////////////////////////////////////////////////////

function decode(array)
{
  var decoded = '';
  for (var i = 0; i < array.length; i++)
  {
    // decoded += String.fromCharCode(array[i]);
    // potential = String.fromCharCode(array[i]);
    // console.log(array[i], '\t', String.fromCharCode(array[i]))
    if (array[i] < 14)//potential == '\x0a' || potential == '\x0d')
      decoded += '\n'
    else
      decoded += String.fromCharCode(array[i]);
    // // console.log(decoded)
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

function send(cmd)
{
  uart.write(cmd)
  // tessel.sleep(sleepTime)
  console.log(txCount, '\tSent:\n\t', cmd)
  txCount++;
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
  // tessel.sleep(sleepTime);

  // send('AT+CMGF=1\r\n');
  // tessel.sleep(sleepTime);

  // send('AT+CMGS="' + number + '"\r\n');
  // tessel.sleep(sleepTime);

  // send(message + '\r\n');
  // tessel.sleep(sleepTime);

  // send([0x1A]);
}

////////////////////////////////////////////////////////////////////////////////

uart.on('data', function(bytes) {
  // console.log('\n--------------------\nNEW DATA\n', printRecieved(bytes), '\n--------------------\n')
  tessel.sleep(1)
  printRecieved(bytes)
});

// tessel.sleep(10000);
console.log('gogogo!')

send('AT')
tessel.sleep(200);
send('AT')
tessel.sleep(200);
send('AT')
tessel.sleep(200);

// SMS(15555555555, 'You know what we haven\'t played in a while? Jialyaball.');










// setInterval(function(){
//     send('AT+CBC\r\n')
//   }, 10)

// tessel.sleep(3000);

// SMS();

// g3.high()
// tessel.sleep(sleepTime);
// g3.input();
// tessel.sleep(sleepTime);

// //

// g3.output();
// g3.low();
// tessel.sleep(sleepTime);
// g3.input();
// tessel.sleep(sleepTime);














// tessel.sleep(1000);


// commands = ['AT\r\n', 'AT+CMGF=1\r\n']//, 'AT+CMGS="15555555555"\r\n', 'message goes here\r\n']//, 0x1A]

// var characters = 'AT\r\n'


// for (c in commands)
//   send(commands[c])




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




