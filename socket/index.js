import { Server } from "socket.io"
import { GAME_STATE_INIT, WEBSOCKET_SERVER_PORT } from "../config.mjs"
import Manager from "./roles/manager.js"
import Player from "./roles/player.js"
import { abortCooldown } from "./utils/cooldown.js"
import deepClone from "./utils/deepClone.js"
import { createServer } from "http"

let gameState = deepClone(GAME_STATE_INIT)

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["content-type"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io/'
})

console.log(`Server running on port ${WEBSOCKET_SERVER_PORT}`)
httpServer.listen(WEBSOCKET_SERVER_PORT, "0.0.0.0", () => {
  console.log(`Socket.IO server is running on port ${WEBSOCKET_SERVER_PORT}`);
})

io.engine.on("connection_error", (err) => {
  console.log("Connection error:", err);
});

io.on("connection", (socket) => {
  console.log(`A user connected ${socket.id}`)

  socket.on("player:checkRoom", (roomId) =>
    Player.checkRoom(gameState, io, socket, roomId),
  )

  socket.on("player:join", (player) =>
    Player.join(gameState, io, socket, player),
  )

  socket.on("player:getTotalQuestions", () =>
    Player.getTotalQuestions(gameState, io, socket),
  )

  socket.on("manager:createRoom", (password) =>
    Manager.createRoom(gameState, io, socket, password),
  )
  socket.on("manager:kickPlayer", (playerId) =>
    Manager.kickPlayer(gameState, io, socket, playerId),
  )

  socket.on("manager:startGame", () => Manager.startGame(gameState, io, socket))

  socket.on("player:selectedAnswer", (answerKey) =>
    Player.selectedAnswer(gameState, io, socket, answerKey),
  )

  socket.on("manager:abortQuiz", () => Manager.abortQuiz(gameState, io, socket))

  socket.on("manager:nextQuestion", () =>
    Manager.nextQuestion(gameState, io, socket),
  )

  socket.on("manager:showLeaderboard", () =>
    Manager.showLeaderboard(gameState, io, socket),
  )

  socket.on("manager:showFullLeaderboard", () => {
    console.log("Получено событие manager:showFullLeaderboard от клиента:", socket.id);
    Manager.showFullLeaderboard(gameState, io, socket);
  })

  socket.on("manager:showUserStats", (userId) => {
    console.log("Получено событие manager:showUserStats для пользователя:", userId);
    Manager.showUserStats(gameState, io, socket, userId);
  })

  socket.on("manager:showPodium", () => {
    console.log("Получено событие manager:showPodium от клиента:", socket.id);
    Manager.showPodium(gameState, io, socket);
  })

  socket.on("disconnect", () => {
    console.log(`user disconnected ${socket.id}`)
    if (gameState.manager === socket.id) {
      console.log("Reset game")
      io.to(gameState.room).emit("game:reset")
      gameState.started = false
      gameState = deepClone(GAME_STATE_INIT)

      abortCooldown()

      return
    }

    const player = gameState.players.find((p) => p.id === socket.id)

    if (player) {
      gameState.players = gameState.players.filter((p) => p.id !== socket.id)
      socket.to(gameState.manager).emit("manager:removePlayer", player.id)
    }
  })
})
