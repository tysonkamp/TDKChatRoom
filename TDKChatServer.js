// Chatroom server
// Handle commands 'login', 'users', 'quit' and
// not in spec but useful are '?/h/help' and 'adduser'
//
// Author: Tyson Kamp
//
var PORT_NUM = process.env.TDK_CHATROOM_SERVER_PORT  // export to env later
var hashFunc = process.env.TDK_HASH_FUNC
  , hashSalt = process.env.TDK_SALT
  , hashEncoding = process.env.TDK_HASH_ENC
  , TDKAdmin = process.env.TDK_ADM_NAME
var currentUsers = new Array()
var inStream = ''     // buffer for processing incoming messages.
var messages = []     // Messages history
var names = []        // Names of users, for broadcasting
var clientSockets = []      // Holds sockets of authenticated users
var adminSocket      // Holds socket of authenticated administrator
var usersHashedPwds = new Array()  // username,pwd Administrator = admin,tdkAdmin
var DEBUG = false

if ( process.env.TDK_DEBUG == 'true' ) DEBUG = true

if (null == DEBUG || undefined == DEBUG) DEBUG = false // safe by default (cybersec)

var TDKAuth = require('./TDKAuth.js')
var tdkAuth = new TDKAuth(hashFunc, hashEncoding)

var tdkAdmin = process.env.TDK_ADM_NAME
usersHashedPwds[tdkAdmin] = process.env.TDK_ADM_PWD_HASHED
var TDKUserMgr = require('./TDKUserMgr.js')
var tdkUserMgr = new TDKUserMgr(tdkAuth, usersHashedPwds)

console.log('Starting server on port ' + PORT_NUM)
  
var sockListenerFunc = function (socket) {
  if (DEBUG) console.log('Connected: ' + socketName(socket))

  socket.on('close', function(data) { 
    if (DEBUG) console.log('Closed: ' + socketName(socket)) 
    DisconnectUser(socket)
  })
  
  socket.on('data', function (data) {

    // Never in prod!! This console.log will print credentials
    //console.log('Data arrived on ' + socketName(socket) + ' : ' + data.toString())

    inStream += data.toString().replace('\r\n','\n')
    inStream = inStream.toString().replace('\r','\n')

    if ( -1 == inStream.toString().indexOf('\n')) { 
      // keep collecting strings until we hit a \n
      if (DEBUG) console.log('waiting for a \\n')
      return
    }

    let msg = ''
    while ( -1 != inStream.toString().indexOf('\n')) {
      msg = inStream.substring(0,inStream.indexOf('\n'))
      if (DEBUG) console.log('Received from ' + socketName(socket) + ' msg = ' + msg )
      let retMsg = handleMessage(msg, socket) +'\n'
      if (DEBUG) console.log('Writing to ' + socketName(socket) + ' msg = ' + retMsg )
      socket.write( retMsg )
      inStream = inStream.substring(inStream.indexOf('\n') + 1, inStream.length)
    }
  })
}

// Create socket and listen
var chatRoomServer = require('net').createServer(sockListenerFunc)
chatRoomServer.listen(PORT_NUM)

// If a user is leaving via 'quit' or just closing the socket, clean up our lists.
function DisconnectUser(socket) {
  if (-1 != clientSockets.indexOf(socket)) {
    clientSockets.splice(clientSockets.indexOf(socket), 1)
    broadcast(names[socketName(socket)] + ' left the chat.\n', socket)  
    names[socketName(socket)] = null
    delete names[socketName(socket)]
  }
  else if ( adminSocket === socket ) adminSocket = null
}

// Borrowed from https://gist.github.com/creationix/707146
function broadcast(message, sender) {
  clientSockets.forEach(function (client) {
  // Don't want to send it to sender
  if (client === sender || null == names[socketName(client)]) { return }
  else {
    if (DEBUG) console.log('Broadcasting to ' + names[socketName(client)])
    client.write(message)
  }
  })
}

// Just wrap the logic for identifying the socket in a function in case we 
// want to change it in the future, it's in only one place
function socketName(socket) {
  return socket.remoteAddress + ' ' + socket.remotePort
}

// Process messages, return a string with success/failure information.
function handleMessage(msg, socket) {
  let remoteAddress = socket.remoteAddress
  let remotePort = socket.remotePort

  // Command: login
  if (true === msg.startsWith('login')) {
    let cmdMsg = 'Command must be of the form \'login u,p\'.'

    if (9 <= msg.length && -1 != msg.indexOf(',') && msg.startsWith('login ')) {
      var uname = msg.substring(6, msg.indexOf(','))
      var pwd = msg.substring(msg.indexOf(',') + 1, msg.length)

      if (null === uname || '' === uname || null === pwd || '' == pwd) {
        return 'Missing username or password. ' + cmdMsg
      }

      names.forEach(function (socketName) { 
        if (names[socketName] == uname ) 
          return uname + ' is already logged in.' })

      if (true === tdkUserMgr.verifyUser(uname, pwd + hashSalt)) {
        if (tdkAdmin === uname) adminSocket = socket
        else {
          clientSockets.push(socket)
          names[socketName(socket)] = uname
          broadcast(uname + ' has joined.\n', socket)
        }
        let retMsg = 'User ' + uname + ' authenticated successfully.'

        // return recent chat history
        if ( 0 != messages.length ) {
          messages.forEach(function(msg) { retMsg += '\n' + msg } )
        }

        return retMsg
      }
      else {
        return 'Failed to authenticate.'
      }
    }
    return cmdMsg  
  }

  // Remaining commands require a login, adminSocket == socket means this is the admin
  if (-1 == clientSockets.indexOf(socket) &&  adminSocket != socket ) {
    return 'Please login first.'
  }
  // Command: users
  else if ('users' == msg ) {
    var keys = [];
    for(var key in names) keys.push(names[key])
    return keys.toString()
  }
  else if (msg.startsWith('me ') || 'me' == msg ) {
    if ('me' == msg || 'me ' == msg) {
      return 'Please include a message to send: me <your message>.'
    }
    let curMsg = names[socketName(socket)] + ' says > ' + msg.substring(3, msg.length) + '\n'
    messages.push(curMsg)
    if ( 10 < messages.length ) messages.shift()

    // broadcast to other users
    broadcast(curMsg, socket)
    return 'Message sent.'
  } 
  // Command: quit
  else if ('quit' == msg) {
    DisconnectUser(socket)
    return 'Goodbye.'
  } 
  // Command: adduser
  else if (true == msg.startsWith('adduser') && adminSocket === socket) { // MAKE SURE ONLY ADMIN CAN DO THIS

    let cmdMsg = 'Command must be of the form \'adduser u,p\''

    // message must be of the form 'adduser u,p'
    if (11 <= msg.length && -1 != msg.indexOf(',') && msg.startsWith('adduser ')) {

      // Sanity check uname and pwd
      var uname = msg.substring(8, msg.indexOf(','))
      var pwd = msg.substring(msg.indexOf(',') + 1, msg.length)  
      if (null === uname || '' === uname || null === pwd || '' == pwd) {
        return 'Missing username or password. ' + cmdMsg
      }

      if (tdkUserMgr.userExists(uname)) return 'User already exists.'  
      if (true == tdkUserMgr.addUser(uname, pwd + hashSalt)) {
        return 'User ' + uname + ' added successfully.'
      }
      return 'Failed to add user.'
    }
      
    return cmdMsg  
  }
  // Command: help
  else if ('help' == msg || '?' == msg || 'h' == msg)
  {
    var helpMsg = 'Commands are:\n\tlogin username,password\t\tUse to authenticate'
    helpMsg += '\n\tusers\t\t\t\tDisplay all users logged in'
    helpMsg += '\n\tme msg\t\t\t\tEnter msg into chat room'
    helpMsg += '\n\tquit\t\t\t\tQuit the session'
    helpMsg += '\n\thelp\t\t\t\tThis message'
    if ( adminSocket === socket ) helpMsg += '\n\tadduser username,password\t\tUse to add a user.'

    return helpMsg
  }

  return 'Unknown command: ' + msg + '\n'
}
