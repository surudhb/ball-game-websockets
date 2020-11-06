const http = require("http")

const app = require("express")()
app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"))
app.listen(8080, () => console.log("Listening on port 8080"))

const { v4: uuidv4 } = require("uuid")

const websocket_server = require("websocket").server
const http_server = http.createServer()

http_server.listen(8000, () => console.log("Listening on port 8000"))

const ws_server = new websocket_server({ httpServer: http_server })

// DANK STATE MANAGEMENT
// HashMap of all clients
const clients = {}

// Hashmap of all games
const games = {}

ws_server.on("request", request => {
  // client connected
  const connection = request.accept(null, request.origin)
  connection.on("open", () => console.log("opened"))
  connection.on("close", () => console.log("closed"))
  connection.on("message", message => {
    //   received message from client
    const response = JSON.parse(message.utf8Data)
    console.log(response)
    if (response.method === "create") {
      const client_id = response.clientID
      const game_id = uuidv4()
      games[game_id] = {
        id: game_id,
        balls: 20,
        clients: [],
      }

      const payload = {
        method: "create",
        game: games[game_id],
      }

      const con = clients[client_id].connection
      con.send(JSON.stringify(payload))
    }

    if (response.method === "join") {
      const client_id = response.clientID
      const game_id = response.gameID
      const game = games[game_id]
      if (!game.clients.some(c => c.clientID === client_id)) {
        const client_color = generateRandomColor()
        game.clients.push({
          clientID: client_id,
          color: client_color,
        })

        if (game.clients.length == 2) setInterval(updateGameState, 500)

        const payload = {
          method: "join",
          game,
        }

        //   update all clients with new players joined
        game.clients.forEach(c => {
          clients[c.clientID].connection.send(JSON.stringify(payload))
        })
      }
    }

    if (response.method === "play") {
      // global state
      //   const client_id = response.clientID
      const client_color = response.clientColor
      const game_id = response.gameID
      const ball_id = response.ballID

      const state = games[game_id].state || {}
      state[ball_id] = client_color
      games[game_id].state = state
    }
  })

  const client_id = uuidv4()

  clients[client_id] = { connection }

  const payload = {
    method: "connect",
    clientID: client_id,
  }

  connection.send(JSON.stringify(payload))
})

const generateRandomColor = () => {
  const letters = "0123456789ABCDEF"
  const color = ["#"]
  for (let i = 0; i < 6; i++) {
    color.push(letters[Math.floor(Math.random() * letters.length)])
  }
  return color.join("")
}

const updateGameState = () => {
  for (const game of Object.values(games)) {
    const payload = { method: "update", game }
    game.clients.forEach(c => {
      clients[c.clientID].connection.send(JSON.stringify(payload))
    })
  }
}
