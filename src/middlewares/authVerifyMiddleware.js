const UserModel = require("../models/userModel");
const { getAuth, clerkClient } = require("@clerk/express");

const verifyAuthMiddleware = () => {
  return async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ status: "unauthorized" });
      }

      const user = await clerkClient.users.getUser(userId);

      const primaryEmailId = user.primaryEmailAddressId;
      const emailObj =
        user.emailAddresses?.find((e) => e.id === primaryEmailId) ||
        user.emailAddresses?.[0];
      const email = emailObj?.emailAddress || null;

      // Fetch user from your database
      const dbUser = await UserModel.findOne({ clerkUserId: userId });

      if (email) req.headers.email = email;
      req.headers.userId = userId;

      // Calculate isPro status
      const now = new Date();
      const isPro =
        ["active", "trialing", "complete"].includes(
          dbUser?.subscription?.status
        ) && new Date(dbUser?.subscription?.currentPeriodEnd) > now;

      req.user = {
        userId: userId,
        email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        _id: dbUser?._id,
        subscription: dbUser?.subscription || null,
        isPro: isPro,
        userTier: isPro ? "pro" : "free",
      };

      return next();
    } catch (err) {
      console.log(err);
      return res.status(401).json({ status: "unauthorized" });
    }
  };
};

module.exports = verifyAuthMiddleware;
