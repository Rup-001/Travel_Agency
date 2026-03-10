const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { promoCodeValidation } = require("../../validations");
const { promoCodeController } = require("../../controllers");

const router = express.Router();

router.get(
  "/validate-promo",
  validate(promoCodeValidation.validatePromoCode),
  promoCodeController.validatePromoCode
);

router.get("/validate/:code", auth(), promoCodeController.getPromoCodeByCode);

router
  .route("/")
  .post(auth("admin"), validate(promoCodeValidation.createPromoCode), promoCodeController.createPromoCode)
  .get(auth("admin"), validate(promoCodeValidation.getPromoCodes), promoCodeController.getPromoCodes);

router
  .route("/:promoId")
  .get(auth("admin"), validate(promoCodeValidation.getPromoCode), promoCodeController.getPromoCode)
  .patch(auth("admin"), validate(promoCodeValidation.updatePromoCode), promoCodeController.updatePromoCode)
  .delete(auth("admin"), validate(promoCodeValidation.deletePromoCode), promoCodeController.deletePromoCode);

module.exports = router;
