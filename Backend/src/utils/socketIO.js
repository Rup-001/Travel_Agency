const logger = require("../config/logger");

const socketIO = (io) => {
  io.on("connection", (socket) => {
    console.log(`ID: ${socket.id} just connected`);

    socket.on("join-room", (data, callback) => {
      //console.log('someone wants to join--->', data);
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

    socket.on("error", (err) => {
      console.error(`Socket Error for ID ${socket.id}:`, err);
    });

    socket.on("disconnect", (reason) => {
      console.log(`ID: ${socket.id} disconnected. Reason: ${reason}`);
    });
  });
};

module.exports = socketIO;
