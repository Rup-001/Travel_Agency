const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe payment intent
 * @param {number} amount - Total amount in the smallest currency unit (e.g., cents for USD, or keep full for other currencies)
 * @param {string} currency - 'usd', 'eur', 'gbp' etc.
 * @returns {Promise<Object>}
 */
const createPaymentIntent = async (amount, currency = 'usd') => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency,
      payment_method_types: ['card'],
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe Error: ${error.message}`);
  }
};

module.exports = {
  createPaymentIntent,
};
