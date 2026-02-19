const analysisModel = require("../../models/analysisModel.js");
const PDFDocument = require("pdfkit");
const {
  filterAnalysisDataForFree,
} = require("../../middlewares/checkUserTierAndFilterDataMiddleware");

exports.exportResumePdfController = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const analysisData = await analysisModel.findById(analysisId).lean();

    if (!analysisData)
      return res.status(404).json({ error: "Analysis not found" });

    // ✅ Check if user is Pro from middleware
    const isPro = req.user.isPro || false; // middleware থেকে আসছে

    // ✅ Filter data for free users BEFORE generating PDF
    let data = JSON.parse(JSON.stringify(analysisData));

    if (!isPro) {
      data = filterAnalysisDataForFree(data);
    }

    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    doc.on("data", (c) => chunks.push(c));

    const primary = "#1E3A8A";
    const subColor = "#6B7280";
    const textColor = "#111827";
    const bg = "#F9FAFB";

    const PAGE_HEIGHT = doc.page.height;
    const MARGIN = 50;
    const BOTTOM_LIMIT = PAGE_HEIGHT - 80;
    let y = MARGIN;

    const newPage = () => {
      doc.addPage();
      y = MARGIN;
    };

    const checkSpace = (h = 25) => {
      if (y + h > BOTTOM_LIMIT) newPage();
    };

    const write = (t, opts = {}) => {
      if (!t) return;
      const width = opts.width || 500;
      doc
        .font(opts.font || "Helvetica")
        .fontSize(opts.size || 10)
        .fillColor(opts.color || textColor);
      const h = doc.heightOfString(t, { width });
      checkSpace(h + 10);
      doc.text(t, MARGIN, y, { width });
      y += h + (opts.space || 8);
    };

    const title = (t) =>
      write(t, { font: "Helvetica-Bold", size: 14, color: primary, space: 10 });
    const kv = (k, v) => write(`${k}: ${v ?? "N/A"}`);

    // === HEADER ===
    doc
      .fillColor(primary)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Resume Analysis Report", MARGIN, y);
    y += 30;

    // ✅ Show user tier in PDF
    if (!isPro) {
      doc
        .fillColor("#EF4444")
        .fontSize(10)
        .text("⭐ FREE USER - Upgrade to unlock full insights", MARGIN, y);
      y += 15;
    }

    write(`Generated: ${new Date().toLocaleString()}`, { color: subColor });
    y += 20;

    // === MAIN INFO CARD ===
    const info = data.resumeSections?.personalInfo || {};
    const persona = data.persona ? data.persona.replace("_", " ") : "N/A";
    const industry = data.industry || "N/A";

    doc
      .roundedRect(MARGIN - 5, y - 5, 510, 105, 8)
      .fillAndStroke(bg, "#E5E7EB");
    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(info.fullName || "N/A", MARGIN + 10, y + 10);

    // left column
    doc.font("Helvetica").fontSize(10).fillColor(subColor);
    doc.text(info.email || "", MARGIN + 10, y + 30);
    doc.text(info.phone || "", MARGIN + 10, y + 45);
    doc.text(info.location || "", MARGIN + 10, y + 60);
    if (info.portfolio)
      doc.fillColor(primary).text(info.portfolio, MARGIN + 10, y + 75);

    // right column tags
    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Persona", 380, y + 8);
    doc.roundedRect(430, y + 5, 90, 18, 5).fill("#DBEAFE");
    doc
      .fillColor(primary)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(persona, 437, y + 9);

    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Industry", 380, y + 40);
    doc.roundedRect(430, y + 35, 90, 18, 5).fill("#E9D5FF");
    doc
      .fillColor("#7E22CE")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(industry, 437, y + 42);

    y += 115;

    // === OVERVIEW ===
    title("Overview");
    kv("Actor", data.actor);
    kv("Persona", data.persona);
    kv("Industry", data.industry);
    kv("Region", data.region);
    kv("Desired Salary", data.desiredSalary);
    kv(
      "Persona Confidence",
      (data.personaInferenceConfidence * 100)?.toFixed(0) + "%"
    );

    // === SCORES ===
    title("Scores");
    kv("Overall", `${data.scores?.overall}%`);
    Object.entries(data.breakdown || {}).forEach(([k, v]) => kv(k, `${v}%`));

    // === JOB FIT ===
    title("Job Fit");
    const jf = data.jobFit || {};
    kv("Score", jf.score);
    kv("Keyword Match", jf.keywordMatch);
    kv("Skills Alignment", jf.skillsAlignment);
    kv("Benchmark", jf.benchmark);

    // ✅ Show interview data only for Pro users
    if (isPro && data.interview) {
      title("Interview Probability");
      const iv = data.interview;
      kv("Probability", iv.probability);
      kv("Rationale", iv.rationale);
      kv("Benchmark", iv.benchmark);
      kv("Confidence", (iv.confidence * 100)?.toFixed(0) + "%");
    } else if (!isPro) {
      write("🔒 Interview analysis available in Pro plan", {
        color: "#EF4444",
      });
      y += 10;
    }

    // ✅ Show salary data only for Pro users
    if (isPro && data.salary) {
      title("Salary Insights");
      const s = data.salary;
      kv("Region", s.region);
      kv("Min", s.min);
      kv("Max", s.max);
      kv("Desired", s.desired);
      kv("Currency", s.currency);
      kv("Confidence", s.confidence + "%");
      kv("Position", s.position);
      kv("Delta to Median", s.deltaToMedianPct);
      if (s.recommendedAsk)
        kv(
          "Recommended Ask",
          `${s.recommendedAsk.min} - ${s.recommendedAsk.max}`
        );
    } else if (!isPro) {
      write("🔒 Salary insights available in Pro plan", { color: "#EF4444" });
      y += 10;
    }

    // === SUGGESTIONS ===
    title("Suggestions");
    data.suggestions?.forEach((sug, i) =>
      write(`${i + 1}. [${sug.priority}] ${sug.text} → ${sug.targetSection}`)
    );

    // === OPTIMIZATION ===
    title("Optimization");
    const opt = data.optimization || {};
    kv("Skills", opt.skills?.join(", "));

    // ✅ Show limited data for free users
    if (isPro) {
      kv("Languages", opt.languages?.join(", "));
      kv("Certifications", opt.certifications?.join(", "));
      kv("Achievements", opt.achievements?.join(", "));
    }
    kv("Keyword Gaps", opt.keywordGaps?.join(", "));

    // === CAREER PATHS ===
    title("Career Paths");
    (data.careerPaths || []).forEach((c) => {
      write(`Industry: ${c.industry}`, { font: "Helvetica-Bold" });
      kv("Roles", c.roles?.join(", "));
      if (isPro && c.accelerators) {
        kv("Accelerators", c.accelerators.join(", "));
      }
    });

    // === TRENDS ===
    title("Trends");
    kv("Direction", data.trends?.direction);
    kv("Note", data.trends?.note);
    if (isPro && data.trends?.monthlyGrowth) {
      kv("Monthly Growth", data.trends.monthlyGrowth);
    }

    // ✅ Show market insights only for Pro users
    if (isPro && data.marketInsights) {
      title("Market Insights");
      const mi = data.marketInsights;
      kv("Regional Demand", mi.regionalDemand);
      kv("Competition Level", mi.competitionLevel);
      kv("Optimal Timing", mi.optimalTiming);
      kv("Demand Drivers", (mi.demandDrivers || []).join(", "));
    } else if (!isPro) {
      write("🔒 Market insights available in Pro plan", { color: "#EF4444" });
      y += 10;
    }

    // === RESUME SECTIONS ===
    title("Resume Sections");
    const rs = data.resumeSections || {};
    for (const [sec, content] of Object.entries(rs)) {
      write(sec.toUpperCase(), { font: "Helvetica-Bold", color: primary });
      if (Array.isArray(content)) {
        content.forEach((item) => {
          for (const [k, v] of Object.entries(item || {}))
            kv(k, Array.isArray(v) ? v.join(", ") : v);
        });
      } else if (typeof content === "object" && content !== null) {
        for (const [k, v] of Object.entries(content))
          kv(k, Array.isArray(v) ? v.join(", ") : v);
      }
    }

    // === IMPROVEMENTS ===
    title("Improvements");
    const imp = data.improvements || {};
    kv("Section Order", (imp.sectionsOrder || []).join(", "));
    if (imp.summary) {
      kv("Updated Summary", imp.summary.after);
      kv("Reason", imp.summary.why);
      kv("Keywords Added", (imp.summary.keywordsAdded || []).join(", "));
    }
    (imp.experience || []).forEach((ex) => {
      kv(`Exp #${ex.jobIndex}`, (ex.afterBullets || []).join("; "));
    });
    if (imp.skills) {
      kv("Skill Gaps", (imp.skills.keywordGaps || []).join(", "));
      Object.entries(imp.skills.afterGrouped || {}).forEach(([g, arr]) =>
        kv(g, arr.join(", "))
      );
    }

    // ✅ Show premium insights only for Pro OR limited for free
    if (data.premiumInsights) {
      title("Premium Insights");
      const pi = data.premiumInsights;

      if (pi.atsCoverage?.top3Actions) {
        write("Top 3 ATS Actions:");
        pi.atsCoverage.top3Actions.forEach((a) => write("- " + a));
      }

      // ✅ Only for Pro users
      if (isPro) {
        if (pi.atsCoverage) {
          kv("Exact %", pi.atsCoverage.exactPct);
          kv("Partial %", pi.atsCoverage.partialPct);
          kv("Stem %", pi.atsCoverage.stemPct);
          if (pi.atsCoverage.missing?.length) {
            write("Missing Terms:");
            pi.atsCoverage.missing.forEach((m) =>
              write(`- ${m.term} (${(m.weight * 100).toFixed(0)}%)`)
            );
          }
        }

        kv("Comp Percentile", pi.compPercentile);
        if (pi.salaryPercentiles)
          kv(
            "Salary Range",
            `${pi.salaryPercentiles.p25}-${pi.salaryPercentiles.p75} ${pi.salaryPercentiles.currency}`
          );

        if (pi.trendDrilldown) {
          kv(
            "Rising Skills",
            (pi.trendDrilldown.risingSkills || []).join(", ")
          );
          kv("Sparkline (12mo)", pi.trendDrilldown.sparkline?.join(" → "));
        }
        kv("Courses", (pi.certsAndCourses || []).join(", "));
        (pi.skillGaps || []).forEach((g) =>
          kv(`Skill Gap: ${g.skill}`, `${g.severity}%`)
        );
        (pi.impact || []).forEach((i) =>
          kv(`${i.section}`, `${i.score}% → ${i.evidence}`)
        );
        (pi.recruiterPitch || []).forEach((p) => write("• " + p));
        (pi.shortlist || []).forEach((r) =>
          kv(r.title, (r.requirements || []).join(", "))
        );
        (pi.redFlags || []).forEach((r) => write("⚠️ " + r));
      } else {
        write("🔒 Full premium insights available in Pro plan", {
          color: "#EF4444",
        });
        y += 10;
      }
    }

    // === MANAGER VIEW (Pro only) ===
    if (isPro && data.managerView) {
      title("Manager View");
      kv("Summary", data.managerView.summary);
      kv("Red Flags", (data.managerView.redFlags || []).join(", "));
      kv("Must-have Coverage", data.managerView.mustHaveCoverage);
    }

    // ✅ Add upgrade CTA for free users
    if (!isPro) {
      y += 20;
      doc
        .roundedRect(MARGIN - 5, y - 5, 510, 80, 8)
        .fillAndStroke("#FEF3C7", "#F59E0B");
      doc
        .fillColor("#92400E")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("🚀 Upgrade to Pro", MARGIN + 10, y + 10);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          "Unlock interview analysis, salary insights, ATS coverage, and more!",
          MARGIN + 10,
          y + 30,
          { width: 490 }
        );
      doc
        .fillColor("#2563EB")
        .font("Helvetica-Bold")
        .text(`Visit: ${process.env.FRONTEND_URL}/plans`, MARGIN + 10, y + 55);
      y += 90;
    }

    // === FOOTER ===
    doc
      .fontSize(9)
      .fillColor(subColor)
      .text(
        "Resume Evaluator AI — Generated Report",
        MARGIN,
        PAGE_HEIGHT - 50,
        {
          align: "center",
          width: 500,
        }
      );

    doc.end();

    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res
        .status(200)
        .type("application/pdf")
        .set({
          "Content-Type": "application/pdf",
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL,
          "Access-Control-Allow-Credentials": "true",
          "Content-Disposition": `attachment; filename="resume-analysis-${Date.now()}.pdf"`,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        })
        .end(buffer);
    });
  } catch (err) {
    console.error("❌ PDF Error:", err);
    if (!res.headersSent)
      res
        .status(500)
        .json({ error: "PDF generation failed", message: err.message });
  }
};
