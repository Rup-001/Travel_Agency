const logger = require("../config/logger");

const socketIO = (io) => {

  // Handle connection errors at engine level
  io.engine.on("connection_error", (err) => {
    console.error("Engine connection error:", err.req?.url, err.code, err.message, err.req?.headers);
  });

  // Clean up disconnected sockets
  io.on("connection", (socket) => {
    console.log(`✅ New connection: ${socket.id} | Origin: ${socket.handshake.headers.origin}`);

    socket.on("join-room", (data, callback) => {
      if (data?.roomId) {
        socket.join("room" + data.roomId);
        if (typeof callback === "function") {
          callback("Join room successful");
        }
      } else {
        if (typeof callback === "function") {
          callback("Must provide a valid user id");
        }
      }
    });

    socket.on("leave-room", (data) => {
      if (data?.roomId) {
        socket.leave("room" + data.roomId);
        console.log(`ID: ${socket.id} left room: room${data.roomId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`ID: ${socket.id} disconnected. Reason: ${reason}`);
      // Clean up all rooms for this socket
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
    });

    socket.on("error", (err) => {
      console.error(`Socket Error for ID ${socket.id}:`, err);
    });

    // Handle reconnect attempts
    socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket ${socket.id} reconnected after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_error", (err) => {
      console.error(`Socket ${socket.id} reconnection error:`, err.message);
    });
  });

  // Handle general IO errors
  io.on("error", (err) => {
    console.error("Socket.IO error:", err.message);
  });
};

module.exports = socketIO;
