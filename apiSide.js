const express = require('express')
const https = require('https')
const fs = require('fs')
const cors = require('cors')

const port = process.env.PORT || 4002

const app = express()
app.use(cors())

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

app.get('/', (req, res) => {
  res.json({ zebi: 'test' })
})

server.listen(port, () => console.log(`Listening on port 4002`))
