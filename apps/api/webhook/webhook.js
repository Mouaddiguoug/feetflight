const stripe = require('stripe')('sk_test_...');
const express = require('express');
const app = express();

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = 'whsec_c634697ffd32efe8225d7c0da3d0c9db60d2ad990fff2356d186dbbbc9399b4f';

app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

app.listen(2000, () => console.log('Running on port 4242'));
