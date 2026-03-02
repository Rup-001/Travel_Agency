const config = require("../config/config");
const stripe = require("stripe")(config.stripe.secretKey);

/**
 * Create a Stripe checkout session
 * @param {Object} sessionBody
 * @param {number} sessionBody.amount - Total amount in full currency (e.g., 100 for $100)
 * @param {string} sessionBody.currency - 'usd'
 * @param {string} sessionBody.bookingId - Our internal booking ID
 * @param {string} sessionBody.destinationName - Name of the trip
 * @param {string} sessionBody.successUrl - Redirect here after success
 * @param {string} sessionBody.cancelUrl - Redirect here if user cancels
 * @returns {Promise<Object>}
 */
const createCheckoutSession = async ({ amount, currency = 'usd', bookingId, destinationName, successUrl, cancelUrl }) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: destinationName,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: bookingId.toString(), // We use this to find the booking in webhook
    });
    return session;
  } catch (error) {
    throw new Error(`Stripe Error: ${error.message}`);
  }
};

/**
 * Construct Stripe event from webhook signature
 * @param {string} payload - The raw request body
 * @param {string} signature - The stripe-signature header
 * @returns {Object} - Stripe event object
 */
const constructEvent = (payload, signature) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
};

module.exports = {
  createCheckoutSession,
  constructEvent,
};
