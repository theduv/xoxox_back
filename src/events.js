const admin = require('firebase-admin')
const util = require('./util')
const serviceAccount = require('../firestoreTokens.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const db = admin.firestore()

const onPlayerJoinRoom = (data, socket, rooms, clients, io) => {
  let targetRoom = util.findRoomWithName(data.room, rooms)
  if (targetRoom === undefined) {
    rooms = util.addFreshRoom(rooms, data.room)
    targetRoom = util.findRoomWithName(data.room, rooms)
  } else targetRoom.numPlayers++

  const roomName = targetRoom.name
  socket.data = { room: data.room, user: data.player.id }
  db.collection('rooms')
    .doc(data.room)
    .update({
      players: admin.firestore.FieldValue.arrayUnion(data.player.id),
    })
  targetRoom.players.push(data.player)
  targetRoom.chat.push({
    username: '',
    content: `${data.player.name} joined the room`,
    className: 'globalMessage',
  })
  socket.join(roomName)
  io.to(roomName).emit('chatUpdate', room.chat)
  io.to(roomName).emit('currentBoard', {
    board: targetRoom.board,
    lastPlayed: [-1, -1],
  })
  io.to(roomName).emit('turnUpdate', targetRoom.turn)
  io.to(roomName).emit('numPlayers', targetRoom.numPlayers)
  io.to(roomName).emit('playableUpdate', targetRoom.playable)
  io.to(roomName).emit('currentPlayers', targetRoom.players)
  if (targetRoom.numPlayers === 1) {
    socket.emit('playerType', 'O')
  } else if (targetRoom.numPlayers === 2) {
    socket.emit('playerType', 'X')
  } else socket.emit('playerType', '-')
  clients.push({ socket, room: roomName, id: data.player.id })
}

const onClickBoard = (rooms, data, io) => {
  const room = rooms[util.findIndexRoom(data.room, rooms)]

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

const onDisconnect = (data, rooms, clients, io) => {
  const roomName = data.room
  const client = data.user

  console.log(`${client} left the room ${roomName}`)
  const room = util.findRoomWithName(roomName, rooms)
  db.collection('rooms')
    .doc(data.room)
    .update({
      players: admin.firestore.FieldValue.arrayRemove(data.user),
    })
  db.collection('rooms')
    .doc(roomName)
    .get()
    .then((res) => {
      const players = res.data().players
      if (players.length === 0) {
        db.collection('rooms').doc(roomName).delete()
      }
    })

  room.chat.push({
    username: '',
    content: '${} left the room',
    className: 'globalMessage',
  })
  room.numPlayers--
  // if (room.numPlayers === 0) {
  //   rooms.splice(util.findIndexRoom(roomName, rooms), 1)
  //   return
  // }

  io.to(roomName).emit('chatUpdate', room.chat)
  io.to(roomName).emit('numPlayers', room.numPlayers)
}

const onSendMessage = (data, rooms, io) => {
  const room = util.findRoomWithName(data.room, rooms)

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
