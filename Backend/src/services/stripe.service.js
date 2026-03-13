const config = require("../config/config");
const stripe = require("stripe")(config.stripe.secretKey);

/**
 * Create a Stripe checkout session
 * @param {Object} sessionBody
...
 */
const createCheckoutSession = async ({ amount, currency = 'usd', bookingId, destinationName, successUrl, cancelUrl, expiresAt }) => {
  try {
    const sessionOptions = {
      payment_method_types: ["card"], 
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: destinationName,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: bookingId.toString(),
    };

    if (expiresAt) {
      sessionOptions.expires_at = expiresAt;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);
    
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
