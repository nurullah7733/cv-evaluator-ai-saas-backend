const Stripe = require("stripe");
const userModel = require("../../models/userModel");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
exports.createCheckoutSessionController = async (req, res) => {
  const { priceId } = req.body;
  const { userId, email } = req.user;

  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.FRONTEND_URL) {
      return res
        .status(400)
        .json({ status: "fail", data: "Environment variables not set" });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ status: "unauthorized" });
    }

    const user = await userModel.findOne({ clerkUserId: userId });
    if (!user) {
      return res.status(404).json({ status: "fail", data: "User not found" });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await userModel.updateOne({ clerkUserId: userId }, { stripeCustomerId });
    }

    // Fetch price details to determine interval (monthly/yearly)
    const price = await stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval || "unknown";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${interval}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?plan=${interval}`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ status: "fail", data: err.message });
  }
};

// Create billing portal session
exports.createBillingPortalSessionController = async (req, res) => {
  const { userId } = req.user;
  try {
    const userDb = await userModel.findOne({ clerkUserId: userId });
    if (!userDb || !userDb.stripeCustomerId) {
      return res
        .status(400)
        .json({ status: "fail", data: "User or Stripe customer not found" });
    }

    const stripeCustomerId = userDb.stripeCustomerId;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: process.env.FRONTEND_URL,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ status: "fail", data: err.message });
  }
};
