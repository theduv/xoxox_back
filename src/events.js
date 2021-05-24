const util = require('./util')
const firestoreFn = require('./firestoreFunctions')

const onPlayerJoinRoom = async (data, socket, rooms, clients, io) => {
  let targetRoom = util.findRoomWithName(data.room, rooms)
  if (targetRoom === undefined) {
    firestoreFn.createRoom(data.room, data.player.id)
    rooms = util.addFreshRoom(rooms, data.room)
    targetRoom = util.findRoomWithName(data.room, rooms)
  } else targetRoom.numPlayers++

  const playerName = await firestoreFn.getUsernameFromUid(
    data.player.id,
    socket
  )

  socket.emit('getName', playerName)

  const roomName = targetRoom.name
  socket.data = {
    room: data.room,
    user: { id: data.player.id, name: playerName },
  }
  firestoreFn.addUserToRoom(data.room, data.player.id)
  targetRoom.players.push({ id: data.player.id, name: playerName })
  targetRoom.chat.push({
    username: '',
    content: `${playerName} joined the room`,
    className: 'globalMessage',
  })
  socket.join(roomName)
  io.to(roomName).emit('chatUpdate', targetRoom.chat)
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
  const targetRoom = util.findRoomWithName(data.room, rooms)

  if (!targetRoom) return
  targetRoom.turn = targetRoom.turn === 'X' ? 'O' : 'X'
  targetRoom.round++
  targetRoom.board[data.coords[0]][data.coords[1]] = data.player.type
  targetRoom.playable = util.getArrayPlayable(data.coords[0], data.coords[1])
  const wonSquare = util.checkIfSomethingWon(
    targetRoom.board,
    targetRoom.gameState
  )

  targetRoom.lastPlayed = [data.coords[0], data.coords[1]]
  const targetName = targetRoom.name
  if (wonSquare) {
    targetRoom.gameState[wonSquare.square[0] / 3][wonSquare.square[1] / 3] =
      wonSquare.won
    io.to(targetRoom.name).emit('gameStateUpdate', targetRoom.gameState)
    const globalWon = util.checkIfSquareWon(targetRoom.gameState)
    if (globalWon) {
      const loser = util.getLoser(data.player.id, [
        targetRoom.players[0],
        targetRoom.players[1],
      ])
      console.log(loser)
      util.onWinGame(targetRoom, data.player, loser, io)
      return
    }
  }
  io.to(targetName).emit('currentBoard', {
    board: targetRoom.board,
    lastPlayed: targetRoom.lastPlayed,
  })
  io.to(targetName).emit('turnUpdate', targetRoom.turn)
  io.to(targetName).emit('playableUpdate', targetRoom.playable)
}

const onDisconnect = (data, rooms, clients, io) => {
  const roomName = data.room
  const client = data.user

  console.log(`${client.name} left the room ${roomName}`)
  const room = util.findRoomWithName(roomName, rooms)
  if (!room) return

  firestoreFn.removeUserFromRoom(roomName, client)

  room.chat.push({
    username: '',
    content: `${client.name} left the room`,
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
  onSendMessage,
  onDisconnect,
  onPlayerJoinRoom,
  onClickBoard,
}
