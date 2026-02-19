// controllers/user/createUserController.js
const { clerkClient, getAuth } = require("@clerk/express");
const userModel = require("../../models/userModel");

exports.createUserController = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ status: "unauthorized" });

    // Fresh profile from Clerk
    const user = await clerkClient.users.getUser(userId);
    if (!user)
      return res.status(404).json({ status: "fail", data: "User not found" });

    // Email: primary > first
    const primaryEmailId = user.primaryEmailAddressId;
    const emailObj =
      user.emailAddresses?.find((e) => e.id === primaryEmailId) ||
      user.emailAddresses?.[0];
    const email = emailObj?.emailAddress || null;

    // Provider detect (google/facebook/email/etc.)
    const provider =
      user.externalAccounts?.[0]?.provider ||
      user.identities?.[0]?.provider ||
      (email ? "email" : "unknown");

    const nameFallback =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      null;

    // Upsert
    const doc = await userModel.findOneAndUpdate(
      { clerkUserId: user.id },
      {
        $set: {
          clerkUserId: user.id,
          email,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          name: nameFallback,
          imageUrl: user.imageUrl || null,
          provider,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ status: "success", data: doc });
  } catch (error) {
    console.error("Error upserting user:", error);
    return res.status(400).json({
      status: "error",
      data: error.message || "Failed to upsert user",
    });
  }
};

// for check subcription (refech)
exports.meUserController = async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ status: "unauthorized" });

  // Fresh profile from Clerk
  const user = await clerkClient.users.getUser(userId);
  if (!user)
    return res.status(404).json({ status: "fail", data: "User not found" });
  try {
    const userData = await userModel.find({
      clerkUserId: user.id,
    });

    return res.status(200).json({ status: "success", data: userData });
  } catch (e) {
    return res.status(400).json({ status: "fail", data: e });
  }
};
