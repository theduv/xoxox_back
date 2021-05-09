const getArrayPlayable = (line, square) => {
  const bLine = line % 3
  const bSquare = square % 3
  let arraySquares = []

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      arraySquares.push([bLine * 3 + i, bSquare * 3 + j])
    }
  }
  return arraySquares
}

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
      playable: getArrayPlayable(1, 1),
      chat: [],
    }
  else rooms[data.room].numPlayers++

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
  console.log(room.board)
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

const checkIfSquareWon = (square) => {
  for (let i = 0; i < 3; i++) {
    if (
      square[i][0] === square[i][1] &&
      square[i][1] === square[i][2] &&
      square[i][0] !== ''
    )
      return square[i][0]
  }
  for (let j = 0; j < 3; j++) {
    if (
      square[0][j] === square[1][j] &&
      square[1][j] === square[2][j] &&
      square[0][j] !== ''
    )
      return square[0][j]
  }
  if (
    square[0][0] === square[1][1] &&
    square[1][1] === square[2][2] &&
    square[0][0] !== ''
  )
    return square[0][0]
  if (
    square[0][2] === square[1][1] &&
    square[1][1] === square[2][0] &&
    square[0][2] !== ''
  )
    return square[0][2]
  return false
}

const checkIfSomethingWon = (grid, gameState) => {
  let res = false

  for (let i = 0; i < 9; i += 3) {
    for (let j = 0; j < 9; j += 3) {
      res = checkIfSquareWon(
        [
          [grid[i][j], grid[i][j + 1], grid[i][j + 2]],
          [grid[i + 1][j], grid[i + 1][j + 1], grid[i + 1][j + 2]],
          [grid[i + 2][j], grid[i + 2][j + 1], grid[i + 2][j + 2]],
        ],
        gameState
      )
      if (res && gameState[i / 3][j / 3] === '') {
        return { won: res, square: [i, j] }
      }
    }
  }
  return false
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
  checkIfSomethingWon,
  checkIfSquareWon,
  getArrayPlayable,
  onPlayerJoinRoom,
  onClickBoard,
}
