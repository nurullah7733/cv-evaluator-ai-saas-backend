const fs = require("fs");
const { extractTextSmart } = require("../../utils/extractText");
const { verifyFileSignature } = require("../../utils/verifyFileSignature");
const cleanPdfRawText = require("../../utils/cleanPdfRawText");
const { chatGenerate } = require("../../LLM/llm");
const safeJson = require("../../utils/safeJson");

const mongoose = require("mongoose");

const { s3, deleteFileFromS3 } = require("../../utils/s3");
const {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} = require("../../utils/cloudinary");
const { analysisZ } = require("../../zod/analysisSchema");
const analysisModel = require("../../models/analysisModel");
const resumeModel = require("../../models/resumeModel");
const { buildMessages } = require("../../LLM/analysisPrompt");
const { ReAnalysisBuildMessages } = require("../../LLM/reAnalysisPrompt");

const {
  MaterializePromptBuildMessages,
} = require("../../LLM/materializePrompt");
const listService = require("../../services/listServices");

const getDetailsByIdOneJoinService = require("../../services/getDetailsByOneJoinServices");
const {
  generateComparison,
  generateDetailedComparison,
} = require("../../utils/resumeAnalysisComparison");

// Analysis Controller
exports.resumeAnalysisController = async (req, res) => {
  const { jdText, region, industry, actor, persona, desiredSalary, llmName } =
    req.body;

  let tmpPath = req.file?.path;
  let uploadResult;
  let session;
  let transationStarted = false;
  try {
    session = await mongoose.startSession();
    const userId = req?.user?.userId;

    if (!req.file) {
      return res
        .status(400)
        .json({ status: "fail", data: 'Attach "file" (PDF or DOCX).' });
    }

    tmpPath = req.file.path;

    const fileType = await verifyFileSignature(tmpPath);
    if (fileType === "UNKNOWN") {
      return res.status(422).json({
        status: "fail",
        data: "File is not a valid PDF, DOCX, or TXT (signature mismatch).",
      });
    }

    const rawText = await extractTextSmart(tmpPath);
    if (!rawText || rawText.trim().length < 30) {
      return res.status(422).json({
        status: "fail",
        data: "PDF seems scanned or empty. No selectable text found.",
        fix: "Try OCR or upload a text-based PDF.",
      });
    }
    const clnText = rawText ? cleanPdfRawText(rawText) : "";

    const messages = buildMessages(
      clnText,
      jdText,
      region,
      industry,
      actor,
      persona,
      desiredSalary,
    );
    const { provider, text } = await chatGenerate({
      messages,
      use: llmName || process.env.PROVIDER || "mistral",
      useStructuredOutput: true,
    });

    const cleanJson = safeJson(text);

    const parsed = analysisZ.parse(cleanJson);
    uploadResult = await uploadFileToCloudinary(tmpPath, req.file.originalname);
    parsed.filename = req?.file?.filename;
    parsed.version = 1;
    parsed.isLatest = true;

    // Start Transaction
    session.startTransaction();
    transationStarted = true;

    // STEP 1: First Resume save (WITHOUT latestAnalysisId)
    const [saveResumeToDBResult] = await resumeModel.create(
      [
        {
          clerkUserId: userId,
          provider: provider,
          filename: req?.file?.filename,
          fileUrl: uploadResult.fileUrl,
          storageProvider: "cloudinary",
          storagePublicId: uploadResult.publicId,
          originalFilename: req?.file?.originalname,
          fileType: req?.file?.mimetype,
          size: req?.file?.size,

          target: {
            actor: parsed?.actor,
            region: parsed?.region,
            lastJdText: parsed?.jdText,
            industry: parsed?.industry,
            persona: parsed?.persona,
            lastDesiredSalary: parsed?.desiredSalary,
          },

          resumeSections: {
            clnRawText: clnText,
            personalInfo: parsed?.resumeSections?.personalInfo,
            summary: parsed?.resumeSections?.summary,
            experience: parsed?.resumeSections?.experience,
            education: parsed?.resumeSections?.education,
            skills: parsed?.resumeSections?.skills,
            projects: parsed?.resumeSections?.projects,
            certifications: parsed?.resumeSections?.certifications,
            awards: parsed?.resumeSections?.awards,
            publications: parsed?.resumeSections?.publications,
            volunteer: parsed?.resumeSections?.volunteer,
            additional: parsed?.resumeSections?.additional,
          },
        },
      ],
      { session },
    );

    // STEP 2: Analysis save (WITH resumeId)
    parsed.resumeId = saveResumeToDBResult._id;
    parsed.provider = provider;

    const [saveAnalysisToDBResult] = await analysisModel.create([parsed], {
      session,
    });

    if (!saveAnalysisToDBResult) {
      throw new Error("Failed to save analysis to database.");
    }

    // STEP 3: Resume update (latestAnalysisId + analysisHistory)
    await resumeModel.findByIdAndUpdate(
      saveResumeToDBResult._id,
      {
        latestAnalysisId: saveAnalysisToDBResult._id,
        $push: { analysisHistory: saveAnalysisToDBResult._id },
      },
      { session },
    );

    // Transaction commit
    await session.commitTransaction();
    transationStarted = false;
    const fileUrl = uploadResult.fileUrl;
    uploadResult = null;

    return res.json({
      id: saveResumeToDBResult?._id,
      analysisId: saveAnalysisToDBResult?._id,
      fileUrl,
      name: req.file.originalname,
      storedAs: req.file.filename,
      path: req.file.path,
      size: +(req.file.size / 1_000_000).toFixed(2),
      provider,
      analysisResult: parsed,
      comparison: null,
      meta: { chars: rawText.length },
    });
  } catch (e) {
    // If Error transaction rollback
    if (transationStarted) {
      await session.abortTransaction().catch((error) => {
        console.error("Failed to abort resume transaction:", error.message);
      });
    }
    if (uploadResult && !e.hasErrorLabel?.("UnknownTransactionCommitResult")) {
      await deleteFileFromCloudinary(uploadResult.publicId).catch((error) => {
        console.error("Failed to clean up Cloudinary upload:", uploadResult.publicId, error.message);
      });
    }
    console.error("Transaction failed:", e);
    return res.status(400).json({ status: "fail", data: e.message });
  } finally {
    await session?.endSession();

    // Temp file delete
    try {
      if (tmpPath) await fs.promises.unlink(tmpPath);
    } catch {
      console.error("Failed to delete temp file:", tmpPath);
    }
  }
};

// Re-Analysis Controller with 3 version limit (old versions auto deleted)
exports.resumeReAnalysisController = async (req, res) => {
  const {
    analysisId,
    prevImprovements,
    jdText,
    region,
    industry,
    actor,
    persona,
    desiredSalary,
    llmName,
  } = req.body;
  const session = await mongoose.startSession();
  let transationStarted = false;
  try {
    const userId = req?.user?.userId;

    // ✅ Validation
    if (!analysisId) {
      return res.status(400).json({
        status: "fail",
        data: "analysisId is required",
      });
    }

    const previousAnalysis = await analysisModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(analysisId) } },
      {
        $lookup: {
          from: "resumes",
          localField: "resumeId",
          foreignField: "_id",
          as: "resumeData",
        },
      },
      { $unwind: "$resumeData" },
      { $limit: 1 },
    ]);

    if (previousAnalysis.length === 0) {
      return res.status(400).json({
        status: "fail",
        data: "Analysis not found",
      });
    }

    // ✅ STEP 2: Security Check - User ownership verify
    if (previousAnalysis?.[0].resumeData?.clerkUserId !== userId) {
      return res.status(400).json({
        status: "fail",
        data: "Unauthorized: You don't own this analysis",
      });
    }

    // ✅ STEP 3: clnRawText
    const resumeRawClnText =
      previousAnalysis[0].resumeData?.resumeSections?.clnRawText;

    if (!resumeRawClnText) {
      return res.status(400).json({
        status: "fail",
        data: "Resume raw text not found for reanalysis",
      });
    }

    // STEP 4: Materialize
    const prevImprovementsJsonString = prevImprovements
      ? JSON.stringify(prevImprovements)
      : null;

    const materializedMessages = MaterializePromptBuildMessages(
      resumeRawClnText,
      prevImprovementsJsonString,
    );

    const { provider: materializedProvider, text: materializedText } =
      await chatGenerate({
        messages: materializedMessages,
        use: "mistral", // don't use any LLM without mistral (becouse openai missing data here don't materiallized full data)
        useStructuredOutput: true,
      });

    const materializedTextCleanJson = safeJson(materializedText);
    const updatedMessyTextToMaterializeText =
      materializedTextCleanJson?.updatedMessyTextToMaterializeText;
    // STEP 5: New Analysis generate
    const messages = ReAnalysisBuildMessages(
      updatedMessyTextToMaterializeText,
      jdText,
      region,
      industry,
      actor,
      persona,
      desiredSalary,
      prevImprovementsJsonString,
    );

    const { provider: reAnalysisProvider, text: reAnalysisText } =
      await chatGenerate({
        messages,
        use: llmName || process.env.PROVIDER || "mistral",
        useStructuredOutput: true,
      });

    const cleanJson = safeJson(reAnalysisText);

    const parsed = analysisZ.parse(cleanJson);

    // STEP 6: Transaction
    session.startTransaction();
    transationStarted = true;

    // STEP 7: Previous analysis update (isLatest = false)
    await analysisModel.updateOne(
      { _id: previousAnalysis[0]._id },
      { isLatest: false },
      { session },
    );

    // STEP 8: New analysis save

    const latestAnalysis = await analysisModel
      .findOne({ resumeId: previousAnalysis[0].resumeId })
      .sort({ version: -1 })
      .select("version")
      .session(session)
      .lean();

    const newVersion = latestAnalysis.version + 1;
    parsed.filename = previousAnalysis[0].filename;
    parsed.version = newVersion;
    parsed.previousAnalysisId = previousAnalysis[0]._id;
    parsed.resumeId = previousAnalysis[0].resumeId; // Same resume reference
    parsed.isLatest = true;
    parsed.provider = reAnalysisProvider;

    const [saveAnalysisToDBResult] = await analysisModel.create([parsed], {
      session,
    });

    // STEP 9: Version cleanup - Keep only last 3 versions
    const allVersions = await analysisModel
      .find({ resumeId: previousAnalysis[0].resumeId })
      .sort({ version: -1 })
      .session(session);

    let idsToDelete = [];
    if (allVersions.length > 3) {
      const versionsToDelete = allVersions.slice(3);
      idsToDelete = versionsToDelete.map((v) => v._id);

      await analysisModel.deleteMany(
        { _id: { $in: idsToDelete } },
        { session },
      );
      console.log(`Deleted ${idsToDelete.length} old analysis versions`);
    }

    // STEP 10: Resume update
    const recentAnalysisIds = allVersions
      .slice(0, 3)
      .map((v) => v._id)
      .filter((id) => !idsToDelete.some((delId) => delId.equals(id)));

    await resumeModel.findByIdAndUpdate(
      previousAnalysis[0].resumeData._id,
      {
        latestAnalysisId: saveAnalysisToDBResult._id,
        analysisHistory: recentAnalysisIds,
        provider: reAnalysisProvider,
        "target.actor": parsed?.actor,
        "target.region": parsed?.region,
        "target.lastJdText": parsed?.jdText,
        "target.industry": parsed?.industry,
        "target.persona": parsed?.persona,
        "target.lastDesiredSalary": parsed?.desiredSalary,
      },
      { session },
    );

    //  STEP 11: Transaction commit
    await session.commitTransaction();
    transationStarted = false;
    // STEP 12: Comparison generate
    const comparisonData = generateComparison(previousAnalysis[0], parsed);

    return res.json({
      resumeId: previousAnalysis[0].resumeData._id,
      analysisId: saveAnalysisToDBResult._id,
      version: newVersion,
      previousVersion: previousAnalysis[0].version,
      provider: reAnalysisProvider,
      analysisResult: parsed,
      comparison: comparisonData,
      meta: {
        chars: resumeRawClnText.length,
        deletedVersions: idsToDelete.length,
      },
    });
  } catch (e) {
    //  Error to transaction rollback
    if (transationStarted) {
      await session.abortTransaction();
    }
    console.error("Reanalysis failed:", e);
    return res.status(400).json({ status: "fail", data: e.message });
  } finally {
    // End Session
    session.endSession();
  }
};

// Get Analysis History
exports.getAnalysisHistoryController = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req?.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        status: "fail",
        data: "Invalid resume ID in analysis history",
      });
    }

    const resume = await resumeModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(resumeId),
          clerkUserId: userId,
        },
      },
      {
        $lookup: {
          from: "analyses",
          localField: "analysisHistory",
          foreignField: "_id",
          as: "versions",
        },
      },
      {
        $project: {
          versions: {
            $map: {
              input: "$versions",
              as: "version",
              in: {
                _id: "$$version._id",
                version: "$$version.version",
                createdAt: "$$version.createdAt",
                overallScore: "$$version.scores.overall",
                isLatest: "$$version.isLatest",
              },
            },
          },
        },
      },
    ]);

    return res.json({
      status: "success",
      history: resume[0]?.versions?.sort((a, b) => b.version - a.version) || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};

// Get Specific Version Analysis
exports.getAnalysisVersionController = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await analysisModel.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        status: "fail",
        data: "Analysis version not found",
      });
    }

    return res.json({
      status: "success",
      data: analysis,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};

// Detailed Comparison API (current vs previous or current vs specific)
exports.getDetailedComparisonController = async (req, res) => {
  const isPro = req.user?.isPro || false;
  try {
    const { resumeId, compareWith } = req.params;
    const userId = req?.user?.userId;
    if (!isPro) {
      return res.status(400).json({
        status: "fail",
        data: "Detailed comparison is a Pro feature. Please upgrade to access.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({
        status: "fail",
        data: "Invalid resume ID for detailed comparison",
      });
    }

    const resume = await resumeModel.findOne({
      _id: resumeId,
      clerkUserId: userId,
    });

    if (!resume) {
      return res.status(400).json({ status: "fail", data: "Resume not found" });
    }

    const currentAnalysis = await analysisModel.findById(
      resume.latestAnalysisId,
    );

    let previousAnalysis;
    if (compareWith === "previous") {
      previousAnalysis = await analysisModel.findOne({
        filename: currentAnalysis.filename,
        version: currentAnalysis.version - 1,
      });
    } else {
      previousAnalysis = await analysisModel.findById(compareWith);
    }

    if (!previousAnalysis) {
      return res.status(400).json({
        status: "fail",
        data: "No previous analysis found for comparison",
      });
    }

    const detailedComparison = generateDetailedComparison(
      previousAnalysis,
      currentAnalysis,
    );

    return res.json({
      status: "success",
      comparison: detailedComparison,
      current: {
        version: currentAnalysis.version,
        date: currentAnalysis.createdAt,
        scores: currentAnalysis.scores,
        breakdown: currentAnalysis.breakdown,
      },
      previous: {
        version: previousAnalysis.version,
        date: previousAnalysis.createdAt,
        scores: previousAnalysis.scores,
        breakdown: previousAnalysis.breakdown,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};

// get all resumes with search and pagination
exports.getAllResumesController = async (req, res) => {
  let searchRgx = { $regex: req.params.searchKeyword, $options: "i" };
  let searchArray = [
    { originalFilename: searchRgx },
    { "resumeSections.personalInfo.fullName": searchRgx },
    { "resumeSections.personalInfo.emails": searchRgx },
  ];
  try {
    const allResumesData = await listService(req, resumeModel, searchArray);
    return res.status(200).json(allResumesData);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};

// get resume details by id
exports.getDetailsAResumesController = async (req, res) => {
  let joinStage1 = {
    $lookup: {
      from: "analyses",
      localField: "latestAnalysisId",
      foreignField: "_id",
      as: "analysesData",
    },
  };
  try {
    const resumesData = await getDetailsByIdOneJoinService(
      req,
      resumeModel,
      joinStage1,
    );

    return res.status(200).json(resumesData);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};

// delete resume by id along with all its analysis versions
exports.deleteAResumesController = async (req, res) => {
  let id = req.params.id;
  try {
    const resumeData = await resumeModel.find({
      _id: id,
      clerkUserId: req.user.userId,
    });

    const fileUrl = resumeData[0]?.fileUrl;
    if (!resumeData[0]) {
      return res
        .status(404)
        .json({ status: "fail", data: "Resume not found or user not match." });
    }

    if (resumeData[0].storageProvider === "cloudinary") {
      await deleteFileFromCloudinary(resumeData[0].storagePublicId);
    } else {
      const url = new URL(fileUrl);
      const objectKey = decodeURIComponent(url.pathname.split("/").slice(2).join("/"));
      if (objectKey) {
        await deleteFileFromS3(s3, process.env.HETZNER_S3_BUCKET, objectKey);
      }
    }

    // Delete all analysis versions for this resume
    await analysisModel.deleteMany({
      _id: { $in: resumeData[0]?.analysisHistory },
    });

    await resumeModel.findByIdAndDelete(id);

    return res.status(200).json({
      status: "success",
      message: "Resume and all associated analyses deleted successfully.",
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ status: "fail", data: e.message });
  }
};
