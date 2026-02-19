const Stripe = require("stripe");
const userModel = require("../../models/userModel");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.stripeWebhookController = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res
        .status(400)
        .json({ status: "fail", data: "Webhook secret not set" });
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        const subscriptionId = session?.subscription;
        const customerId = session?.customer;
        const userId = session?.metadata?.userId;

        // Fetch full subscription details
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
          {
            expand: ["latest_invoice", "items.data.price"],
          }
        );

        const lineItem = subscription.latest_invoice?.lines?.data?.[0];
        const periodStart = lineItem?.period?.start;
        const periodEnd = lineItem?.period?.end;

        // Update subscription in your database
        await userModel.findOneAndUpdate(
          { clerkUserId: userId },
          {
            subscription: {
              stripeSubscriptionId: subscriptionId,
              status: subscription.status,
              currentPeriodStart: new Date(periodStart * 1000),
              currentPeriodEnd: new Date(periodEnd * 1000),
              plan: subscription.items.data[0].price.id,
            },
          }
        );
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
