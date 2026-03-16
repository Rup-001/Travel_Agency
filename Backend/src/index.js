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

  // Intercept upgrade requests to strip compression headers ONLY for main socket
  // Use prependListener to ensure this runs BEFORE Socket.io's own upgrade handler
  server.prependListener('upgrade', (req, socket, head) => {
    if (req.url && req.url.includes('/socket.io/')) {
      if (req.headers['sec-websocket-extensions']) {
        console.log(`[Socket.io] Stripping extensions for: ${req.url}`);
        delete req.headers['sec-websocket-extensions'];
      }
    }
  });

  // Initialize Socket.io with the HTTP server
  const socketIo = require("socket.io");
  const socketIO = require("./utils/socketIO");
  const { bookingService } = require("./services");

  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io/",
    transports: ["websocket"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Explicitly disable compression to fix RSV1 error
    perMessageDeflate: false,
    httpCompression: false,
  });
  socketIO(io);
  global.io = io;

  // Cleanup expired bookings every minute
  setInterval(() => {
    bookingService.cleanupExpiredBookings();
  }, 60 * 1000);

  // Listen on all interfaces if myIp is localhost or undefined
  const listenIp = (myIp === "localhost" || !myIp) ? "0.0.0.0" : myIp;

  // Listen on the HTTP server
  server.listen(config.port, listenIp, () => {
    logger.info(`Listening to ip http://${listenIp}:${config.port}`);
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
