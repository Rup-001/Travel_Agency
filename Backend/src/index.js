const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");

// My Local IP Address
const myIp = process.env.BACKEND_IP;

let server;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info("Connected to MongoDB");

  // Create an explicit HTTP server
  server = http.createServer(app);

  // Initialize Socket.io with the HTTP server
  const socketIo = require("socket.io");
  const socketIO = require("./utils/socketIO");
  const { bookingService } = require("./services");

  const io = socketIo(server, {
    cors: {
      origin: "*"
    },
    transports: ["websocket"], // Use WebSocket only for stability
    allowEIO3: true,
    httpCompression: false,
    perMessageDeflate: false,
    cleanupEmptyChildNamespaces: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  socketIO(io);
  global.io = io;

  // Cleanup expired bookings every minute
  setInterval(() => {
    bookingService.cleanupExpiredBookings();
  }, 60 * 1000);

  // Listen on the HTTP server
  server.listen(config.port, myIp, () => {
    logger.info(`Listening to ip http://${myIp}:${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close();
  }
});
