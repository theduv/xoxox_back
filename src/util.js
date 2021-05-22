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

const findIndexRoom = (name, rooms) => {
  return rooms.findIndex((room) => room.name === name)
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

module.exports = {
  findIndexRoom,
  checkIfSomethingWon,
  checkIfSquareWon,
  getArrayPlayable,
}
