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
    // Stripe-er ready-made API call korchi checkout session bananor jonno
    const session = await stripe.checkout.sessions.create({
      // MODERN WAY: Dashboard theke je je payment method on korben sheta auto user-ke dekhabe
      // Ete Google Pay, Apple Pay, Link egulo auto handle hobe browser onujayi
      automatic_payment_methods: {
        enabled: true,
      },
      
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: destinationName, // User kon jaygay jachhe shetar naam
            },
            unit_amount: Math.round(amount * 100), // Stripe poysha (cents) e hishab kore, tai 100 diye gun korlam
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl, // Payment thik thak hole user eikhane jabe
      cancel_url: cancelUrl,   // Payment cancel korle eikhane jabe
      
      // Eita khub e dorkari: Amader internal Booking ID-ta client_reference_id te rekhe dilam
      // Jate Webhook-e Stripe amader eita firye dey
      client_reference_id: bookingId.toString(), 
    });
    
    // Stripe amader ekta URL dibe (session.url)
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
