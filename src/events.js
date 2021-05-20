const util = require('./util')
const serviceAccount = require('../firestoreTokens.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const db = admin.firestore()

const onPlayerJoinRoom = (data, socket, rooms, clients, io) => {
  if (rooms[data.room] === undefined)
    rooms[data.room] = {
      name: data.room,
      round: 0,
      turn: 'O',
      numPlayers: 1,
      players: [],
      gameState: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
      lastPlayed: [-1, -1],
      board: [
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
      ],
      playable: util.getArrayPlayable(1, 1),
      chat: [],
    }
  else rooms[data.room].numPlayers++

  db.collection('rooms')
    .doc(data.room)
    .set({
      players: [data.player.id],
    })
  room = rooms[data.room]
  room.players.push(data.player)
  room.chat.push({
    username: '',
    content: `${data.player.name} joined the room`,
    className: 'globalMessage',
  })
  socket.join(room.name)
  io.to(room.name).emit('chatUpdate', room.chat)
  io.to(room.name).emit('currentBoard', {
    board: room.board,
    lastPlayed: [-1, -1],
  })
  io.to(room.name).emit('turnUpdate', room.turn)
  io.to(room.name).emit('numPlayers', room.numPlayers)
  io.to(room.name).emit('playableUpdate', room.playable)
  io.to(room.name).emit('currentPlayers', room.players)
  if (room.numPlayers === 1) {
    socket.emit('playerType', 'O')
  } else if (room.numPlayers === 2) {
    socket.emit('playerType', 'X')
  } else socket.emit('playerType', '-')
  clients.push({ socket, room: room.name, id: data.player.id })
}

const onClickBoard = (rooms, data, io) => {
  const room = rooms[data.room]

  if (!room) return
  room.turn = room.turn === 'X' ? 'O' : 'X'
  room.round++
  room.board[data.coords[0]][data.coords[1]] = data.player
  room.playable = getArrayPlayable(data.coords[0], data.coords[1])
  const wonSquare = checkIfSomethingWon(room.board, room.gameState)

  room.lastPlayed = [data.coords[0], data.coords[1]]
  if (wonSquare) {
    room.gameState[wonSquare.square[0] / 3][wonSquare.square[1] / 3] =
      wonSquare.won
    io.to(room.name).emit('gameStateUpdate', room.gameState)
    const globalWon = checkIfSquareWon(room.gameState)
    if (globalWon) {
      room.chat.push({
        username: '',
        content: `${globalWon} won the game !`,
        className: 'globalMessage',
      })
      io.to(room.name).emit('currentBoard', {
        board: rooms[data.room].board,
        lastPlayed: room.lastPlayed,
      })
      io.to(room.name).emit('chatUpdate', room.chat)
      io.to(room.name).emit('turnUpdate', '-')
      io.to(room.name).emit('playableUpdate', [])
      return
    }
  }
  io.to(room.name).emit('currentBoard', {
    board: room.board,
    lastPlayed: room.lastPlayed,
  })
  io.to(room.name).emit('turnUpdate', room.turn)
  io.to(room.name).emit('playableUpdate', room.playable)
}

const onChangeName = (data, rooms, io) => {
  const room = rooms[data.room]

  const indexTarget = room.players.findIndex((player) => {
    return player.id === data.playerId
  })
  room.players[indexTarget].name = data.newName
  io.to(room.name).emit('currentPlayers', room.players)
}

const onDisconnect = (socket, rooms, clients, io) => {
  const client = clients.find((client) => {
    return socket === client.socket
  })
  if (!client) return
  const room = rooms[client.room]

  rooms[room.name].chat.push({
    username: '',
    content: 'someone left the room',
    className: 'globalMessage',
  })
  rooms[room.name].numPlayers--
  if (rooms[room.name] === 0) {
    delete rooms[room.name]
    return
  }

  io.to(room.name).emit('chatUpdate', rooms[room.name].chat)
  io.to(room.name).emit('numPlayers', rooms[room.name].numPlayers)
}

const onSendMessage = (data, rooms, io) => {
  const room = rooms[data.room]

  room.chat.push({
    username: data.user,
    content: data.content,
    className: 'userMessage',
  })
  io.to(room.name).emit('chatUpdate', room.chat)
}

module.exports = {
  onChangeName,
  onSendMessage,
  onDisconnect,
  onPlayerJoinRoom,
  onClickBoard,
}
