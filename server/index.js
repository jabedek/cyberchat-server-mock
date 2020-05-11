require("dotenv").config();
const express = require("express");
const socket = require("socket.io");
const path = require("path");
const logger = require("./middleware/logger");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const PORT = process.env.PORT || 5000;

const app = express();

const botName = "Cyberchat";
const botId = "78654-234565";

app.use(logger);
app.use(express.json());

//  GET home page of Server
app.get("/", function (req, res, next) {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Handles any requests that don't match the ones above
app.get("/*", (req, res) => {
  res.status(400).sendFile(path.join(__dirname, "404.html"));
});

const server = app.listen(PORT, () => {
  console.log("Listening on", PORT);
});

io = socket(server);

io.on("connection", (client) => {
  client.on("USER_JOIN", ({ username, room, time }) => {
    const user = userJoin(client.id, username, room, time);
    // Broadcast when a user connects
    client.join(user.room);

    client.broadcast
      .to(user.room)
      .emit(
        "SERVER_MESSAGE",
        formatMessage(botName, `${user.username} has joined the room`, botId)
      );

    // Send users and room info
    io.to(user.room).emit("ROOM_USERS", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Send initial message to Chat and username as it is confirmation of good connection
    client.emit("SERVER_REGISTER", {
      botMessage: formatMessage(botName, "Welcome to Cyberchat!", botId),
      username: username,
      id: client.id,
    });
  });

  // Listen for chatMessage
  client.on("USER_MESSAGE", (message) => {
    const user = getCurrentUser(client.id);
    io.to(user.room).emit("SERVER_MESSAGE", message);
  });

  // Runs when client disconnects
  client.on("disconnect", () => {
    console.log("disconnecting");

    const user = userLeave(client.id);

    if (user) {
      io.to(user.room).emit(
        "SERVER_MESSAGE",
        formatMessage(botName, `${user.username} has left the room`, botId)
      );

      // Send users and room info
      io.to(user.room).emit("ROOM_USERS", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});
