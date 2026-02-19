const mongoose = require("mongoose");

var userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    clerkUserId: { type: String, index: true, unique: true },
    imageUrl: { type: String },
    provider: {
      type: String,
    },

    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
    },
    subscription: {
      subscriptionId: String, // 'sub_xxx'
      status: String, // 'active' | "complete" | 'canceled' | 'past_due'
      priceId: String, // 'price_xxx'
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      plan: String,
    },
  },

  { versionKey: false, timestamps: true }
);

const UserModel = mongoose.model("users", userSchema);
module.exports = UserModel;
