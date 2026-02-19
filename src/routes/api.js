const {
  exportResumePdfController,
} = require("../controllers/exportPdfControllers/exportPdfControllers");
const {
  resumeAnalysisController,
  resumeReAnalysisController,
  getAllResumesController,
  getDetailsAResumesController,
  deleteAResumesController,
  getAnalysisHistoryController,
  getDetailedComparisonController,
  getAnalysisVersionController,
} = require("../controllers/resumeController/resumeAnalysisController");
const {
  createCheckoutSessionController,
  createBillingPortalSessionController,
} = require("../controllers/stripeController/stripeController");

const {
  createUserController,
  meUserController,
} = require("../controllers/usersController/usersController");
const verifyAuthMiddleware = require("../middlewares/authVerifyMiddleware");
const {
  checkUserTierAndFilterData,
} = require("../middlewares/checkUserTierAndFilterDataMiddleware");
const { uploadFiles } = require("../middlewares/fileUploadMiddleware");

const router = require("express").Router();

// Health
router.get("/health", (_req, res) => res.json({ ok: true }));

// User creation route
router.get("/create-user", createUserController);
router.get("/me", meUserController);

//  resume analysis route
router.post(
  "/resume-analysis",
  verifyAuthMiddleware(),
  checkUserTierAndFilterData(),
  uploadFiles.single("file"),
  resumeAnalysisController
);

// resume re-analysis route
router.post(
  "/resume-reanalysis",
  verifyAuthMiddleware(),
  checkUserTierAndFilterData(),
  resumeReAnalysisController
);

router.get(
  "/resume-history/:resumeId",
  verifyAuthMiddleware(),
  // checkUserTierAndFilterData(), its not need its just simple data.
  getAnalysisHistoryController
);
router.get(
  "/compare/:resumeId/:compareWith",
  verifyAuthMiddleware(),
  // checkUserTierAndFilterData(), its not needed becouse (structure different and its hidden button for free user in frontend)
  getDetailedComparisonController
);

// get analysis version by analysisId
router.get(
  "/get-analysis/:analysisId",
  verifyAuthMiddleware(),
  checkUserTierAndFilterData(),
  getAnalysisVersionController
);

// resume list route
router.get(
  "/all-resumes/:pageNo/:perPage/:searchKeyword",
  verifyAuthMiddleware(),
  getAllResumesController
);

// resume details by id route
router.get(
  "/get-resume-details-by-id/:id",
  verifyAuthMiddleware(),
  checkUserTierAndFilterData(),
  getDetailsAResumesController
);

// resume details by id route
router.get(
  "/delete-resume-by-id/:id",
  // verifyAuthMiddleware(),
  // checkUserTierAndFilterData(),
  deleteAResumesController
);

// resume details by id route
router.get(
  "/export-pdf/:analysisId",
  verifyAuthMiddleware(),
  checkUserTierAndFilterData(),
  exportResumePdfController
);

// Stripe create checkout session
router.post(
  "/stripe-create-checkout-session",
  verifyAuthMiddleware(),
  createCheckoutSessionController
);

// Stripe create billing portal session
router.post(
  "/stripe-create-billing-portal-session",
  verifyAuthMiddleware(),
  createBillingPortalSessionController
);

// Stripe webhook move to app.js

module.exports = router;
