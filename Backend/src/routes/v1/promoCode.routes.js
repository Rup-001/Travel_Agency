const express = require("express");
const auth = require("../../middlewares/auth");
const { promoCodeController } = require("../../controllers");

const router = express.Router();

router
  .route("/")
  .post(auth("admin"), promoCodeController.createPromoCode)
  .get(auth("admin"), promoCodeController.getPromoCodes);

router
  .route("/:promoId")
  .patch(auth("admin"), promoCodeController.updatePromoCode)
  .delete(auth("admin"), promoCodeController.deletePromoCode);

router.get("/validate/:code", auth(), promoCodeController.getPromoCode);

module.exports = router;
