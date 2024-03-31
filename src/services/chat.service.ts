import Stripe from "stripe";

class chatService {
    private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });

}