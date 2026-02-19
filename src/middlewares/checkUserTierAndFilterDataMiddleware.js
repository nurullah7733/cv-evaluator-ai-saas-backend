const resumeModel = require("../models/resumeModel");

const checkUserTierAndFilterData = () => {
  return async (req, res, next) => {
    const isPro = req.user?.isPro || false;

    // Override res.json to filter data based on user tier
    const originalJson = res.json;
    res.json = function (data) {
      // Only filter analysis data for free users
      if (!isPro) {
        if (data?.analysisResult) {
          console.log("Original Data 1:");
          data.analysisResult = filterAnalysisDataForFree(data.analysisResult);
        } else if (data?.data?.[0]?.analysesData?.[0]) {
          console.log("Original Data 2: Array structure");

          data.data[0].analysesData[0] = filterAnalysisDataForFree(
            data.data[0].analysesData[0]
          );
        } else if (data?.data) {
          console.log("Original Data 3:");
          data.data = filterAnalysisDataForFree(data.data);
        }

        if (
          data.analysisResult ||
          data?.data?.[0]?.analysesData?.[0] ||
          data.data
        ) {
          // Add upgrade prompt
          data.upgradeInfo = {
            userTier: "free",
            message: "Upgrade to Pro to unlock advanced insights!",
            benefits: [
              "Interview probability analysis",
              "Detailed salary benchmarks",
              "ATS coverage analysis",
              "Market trends & insights",
              "Premium optimization suggestions",
              "Recruiter pitch generator",
            ],
            upgradeUrl: `${process.env.FRONTEND_URL}/plans`,
          };
        }
      }

      // Call original json method
      originalJson.call(this, data);
    };

    next();
  };
};

// Function to filter analysis data for free users
const filterAnalysisDataForFree = (analysisData) => {
  return {
    _id: analysisData._id,
    // Basic scores (keep all)
    scores: analysisData.scores,

    // Basic breakdown (keep all)
    breakdown: analysisData.breakdown,

    // Job fit basic info (keep all)
    jobFit: {
      score: analysisData.jobFit?.score,
      keywordMatch: analysisData.jobFit?.keywordMatch,
      skillsAlignment: analysisData.jobFit?.skillsAlignment,
      benchmark: analysisData.jobFit?.benchmark,
    },

    // Remove premium fields: interview, salary, premiumInsights, marketInsights
    // interview: undefined,  // Hidden for free users
    // salary: undefined,     // Hidden for free users

    // Limited suggestions (only priority 1, max 3)
    suggestions:
      analysisData.suggestions?.filter((s) => s.priority === 1)?.slice(0, 3) ||
      [],

    // Basic optimization (limited)
    optimization: {
      skills: analysisData.optimization?.skills || [],
      keywordGaps: analysisData.optimization?.keywordGaps?.slice(0, 3) || [],
      // Remove: certifications, achievements, languages
    },

    // Basic career paths (remove accelerators)
    careerPaths:
      analysisData.careerPaths?.map((path) => ({
        industry: path.industry,
        roles: path.roles,
        // accelerators removed
      })) || [],

    // Basic trends (limited info)
    trends: {
      direction: analysisData.trends?.direction,
      note: "Upgrade to Pro for detailed market analysis",
    },

    // Keep resume sections (this is basic parsing)
    resumeSections: analysisData.resumeSections,

    // Keep all improvements (for reanalysis)
    improvements: analysisData.improvements,

    // keep only top 3 ATS actions from premiumInsights
    premiumInsights: {
      atsCoverage: {
        top3Actions: analysisData.premiumInsights?.atsCoverage?.top3Actions,
      },
    },

    // Keep metadata
    actor: analysisData.actor,
    persona: analysisData.persona,
    industry: analysisData.industry,
    jdText: analysisData.jdText,
    desiredSalary: analysisData.desiredSalary,
    region: analysisData.region,
    modelMeta: analysisData.modelMeta,

    // Add restriction notice
    _freeUserRestrictions: {
      hiddenFeatures: [
        "Interview probability analysis",
        "Salary benchmarking",
        "Premium insights & ATS coverage",
        "Detailed market trends",
        "Advanced optimization suggestions",
        "Recruiter pitch generator",
      ],
    },
  };
};

module.exports = { checkUserTierAndFilterData, filterAnalysisDataForFree };
