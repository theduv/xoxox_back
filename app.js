const express = require('express')
const https = require('https')
const fs = require('fs')
const cors = require('cors')

const port = process.env.PORT || 4001

const app = express()
app.use(cors())

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

const io = require('socket.io')(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

let clients = []

let rooms = {}

const getArrayPlayable = (line, square) => {
  const bLine = line % 3
  const bSquare = square % 3
  let arraySquares = []

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      arraySquares.push([bLine * 3 + i, bSquare * 3 + j])
    }
  }
  console.log('line 38: arraySquares')
  console.log(arraySquares)
  return arraySquares
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
        console.log(`line 88: i: ${i} | j: ${j}`)
        return { won: res, square: [i, j] }
      }
    }
  }
  console.log(`line 93: ${res}`)
  return false
}

const onPlayerJoinRoom = (data, socket) => {
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
  io.to(room.name).emit('currentBoard', room.board)
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

io.on('connection', (socket) => {
  socket.on('playerJoined', (data) => {
    if (data.username === undefined || data.username === 'Anonymous')
      socket.emit('anonymousPlayer')
    onPlayerJoinRoom(data, socket)
  })
  socket.on('clickBoard', (data) => {
    const room = rooms[data.room]

    if (!room) return
    room.turn = room.turn === 'X' ? 'O' : 'X'
    room.round++
    room.board[data.coords[0]][data.coords[1]] = data.player
    room.playable = getArrayPlayable(data.coords[0], data.coords[1])
    const wonSquare = checkIfSomethingWon(room.board, room.gameState)
    console.log('line 163: wonSquare')
    console.log(wonSquare)

    if (wonSquare) {
      console.log('line 167: wonSquare')
      console.log(wonSquare)
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
        io.to(room.name).emit('currentBoard', rooms[data.room].board)
        io.to(room.name).emit('chatUpdate', room.chat)
        io.to(room.name).emit('turnUpdate', '-')
        io.to(room.name).emit('playableUpdate', [])
        return
      }
    }
    io.to(room.name).emit('currentBoard', room.board)
    io.to(room.name).emit('turnUpdate', room.turn)
    io.to(room.name).emit('playableUpdate', room.playable)
  })
  socket.on('changeName', (data) => {
    const room = rooms[data.room]

    console.log(data)
    console.log(room.players)
    const indexTarget = room.players.findIndex((player) => {
      return player.id === data.playerId
    })
    room.players[indexTarget].name = data.newName
    io.to(room.name).emit('currentPlayers', room.players)
  })
  socket.on('sendMessage', (data) => {
    const room = rooms[data.room]

    room.chat.push({
      username: data.user,
      content: data.content,
      className: 'userMessage',
    })
    io.to(room.name).emit('chatUpdate', room.chat)
  })
  socket.on('disconnect', () => {
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
    io.to(room.name).emit('chatUpdate', rooms[room.name].chat)
    rooms[room.name].numPlayers--
    io.to(room.name).emit('numPlayers', rooms[room.name].numPlayers)
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
