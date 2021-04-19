const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 3000;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server);

let clients = [];

let rooms = {};

const getArrayPlayable = (line, square) => {
  const bLine = line % 3;
  const bSquare = square % 3;
  let arraySquares = [];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      arraySquares.push([bLine * 3 + i, bSquare * 3 + j]);
    }
  }
  return arraySquares;
};

const checkIfSquareWon = (square) => {
  for (let i = 0; i < 3; i++) {
    if (
      square[i][0] === square[i][1] &&
      square[i][1] === square[i][2] &&
      square[i][0] !== ""
    )
      return square[i][0];
  }
  for (let j = 0; j < 3; j++) {
    if (
      square[0][j] === square[1][j] &&
      square[1][j] === square[2][j] &&
      square[0][j] !== ""
    )
      return square[0][j];
  }
  if (
    square[0][0] === square[1][1] &&
    square[1][1] === square[2][2] &&
    square[0][0] !== ""
  )
    return square[0][0];
  if (
    square[0][2] === square[1][1] &&
    square[1][1] === square[2][0] &&
    square[0][2] !== ""
  )
    return square[0][2];
  return false;
};

const checkIfSomethingWon = (grid, gameState) => {
  let res = false;

  for (let i = 0; i < 9; i += 3) {
    for (let j = 0; j < 9; j += 3) {
      res = checkIfSquareWon(
        [
          [grid[i][j], grid[i][j + 1], grid[i][j + 2]],
          [grid[i + 1][j], grid[i + 1][j + 1], grid[i + 1][j + 2]],
          [grid[i + 2][j], grid[i + 2][j + 1], grid[i + 2][j + 2]],
        ],
        gameState
      );
      if (res && gameState[i / 3][j / 3] === "")
        return { won: res, square: [i, j] };
    }
  }
  return res;
};

const onPlayerJoinRoom = (data, socket) => {
  if (rooms[data] === undefined)
    rooms[data] = {
      name: data,
      round: 0,
      turn: "O",
      numPlayers: 1,
      gameState: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      board: [
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
      ],
      playable: getArrayPlayable(1, 1),
      chat: [],
    };
  else rooms[data].numPlayers++;

  room = rooms[data];
  socket.join(rooms[data].name);
  io.to(room.name).emit("currentBoard", room.board);
  io.to(room.name).emit("turnUpdate", room.turn);
  io.to(room.name).emit("numPlayers", room.numPlayers);
  if (room.numPlayers === 1) socket.emit("playerType", "O");
  else if (room.numPlayers === 2) socket.emit("playerType", "X");
  else socket.emit("playerType", "-");
  clients.push({ socket, room: data });
};

io.on("connection", (socket) => {
  socket.on("playerJoined", (data) => {
    console.log("player joined room " + data);
    onPlayerJoinRoom(data, socket);
  });
  socket.on("clickBoard", (data) => {
    const room = rooms[data.room];

    console.log(room);
    if (!room) return;
    room.turn = room.turn === "X" ? "O" : "X";
    room.board[data.coords[0]][data.coords[1]] = data.player;
    room.playable = getArrayPlayable(data.coords[0], data.coords[1]);
    const wonSquare = checkIfSomethingWon(room.board, room.gameState);

    if (wonSquare) {
      console.log("wonSquare", wonSquare);
      room.gameState[wonSquare.square[0] / 3][wonSquare.square[1] / 3] =
        wonSquare.won;
      io.to(room.name).emit("gameStateUpdate", room.gameState);
      const globalWon = checkIfSquareWon(room.gameState);
      if (globalWon) {
        room.chat.push({
          username: "",
          content: `${globalWon} won the game !`,
          className: "globalMessage",
        });
        io.to(room.name).emit("chatUpdate", room.chat);
        io.to(room.name).emit("turnUpdate", "-");
        io.to(room.name).emit("playableUpdate", []);
        return;
      }
    }
    io.to(room.name).emit("currentBoard", rooms[data.room].board);
    io.to(room.name).emit("turnUpdate", room.turn);
    io.to(room.name).emit("playableUpdate", room.playable);
  });
  socket.on("sendMessage", (data) => {
    const room = rooms[data.room];

    console.log(data);
    room.chat.push({
      username: data.user,
      content: data.content,
      className: "userMessage",
    });
    io.to(room.name).emit("chatUpdate", room.chat);
  });
  socket.on("disconnect", () => {
    const client = clients.find((client) => {
      return socket === client.socket;
    });
    if (!client) return;
    const room = client.room;

    console.log("player left room " + room);
    rooms[room].numPlayers--;
    io.to(room).emit("numPlayers", rooms[room].numPlayers);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
