const express = require("express");
const config = require("../../config/config");
const authRoute = require("./auth.routes");
const userRoute = require("./user.routes");
const heroSectionRoute = require("./heroSection.routes");
const destinationRoute = require("./destination.routes");
const inventoryRoute = require("./inventory.routes");
const docsRoute = require("./docs.routes");


const router = express.Router();

// ✅ Root route
router.get("/", (req, res) => {
  res.status(200).json({
    message: "API is working.",
  });
});

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/hero-section",
    route: heroSectionRoute,
  },
  {
    path: "/destinations",
    route: destinationRoute,
  },
  {
    path: "/inventory",
    route: inventoryRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: "/docs",
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === "development") {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
