// Chatroom client
//
// Author: Tyson Kamp
//

var portNum = process.env.TDK_CHATROOM_SERVER_PORT;

// Handle exceptions handlers
process.on('uncaughtException', function(err) { console.log('Caught exception: ' + err); })

// Open socket
console.log("Connecting to " + portNum)
var s = require('net').Socket()

var inStream = '';
s.on('data', function(data) { 
  inStream += data.toString().replace('\r\n','\n')
  inStream = inStream.toString().replace('\r','\n')

  if ( -1 == inStream.toString().indexOf('\n')) { 
    // keep collecting strings until we hit a \n
    //console.log('waiting for a \\n')
    return
  }

  let msg = ''
  while ( -1 != inStream.toString().indexOf('\n')) {
    msg = inStream.substring(0,inStream.indexOf('\n'))
    console.log('[MSG]: ' + msg)
    if (msg.toString().replace('\n','') == 'Goodbye.') done()    
    inStream = inStream.substring(inStream.indexOf('\n') + 1, inStream.length)
  }
})


s.on('close', function(data) { console.log('Server closed connection : ' + data); })
s.connect(portNum);

// Handle commands from stdin until user types 'quit'
process.stdin.resume()
process.stdin.setEncoding('utf8')
var util = require('util')

// Execution will wait here, Ctrl-c or user tyoing 'quit' ends execution
process.stdin.on('data', function (text) {
  s.write(text.toString());
  if (text.toString().startsWith('quit')) done()
})

function done() {
  console.log('Quitting.');
  s.end();
  process.exit();
}