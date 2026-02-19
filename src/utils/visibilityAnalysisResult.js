function filterAnalysisForPlan(doc, plan /* 'free' | 'premium' */) {
  const json = doc.toObject ? doc.toObject() : { ...doc };
  if (plan === "premium") return json;

  delete json.premiumInsights;
  return json;
}
module.exports = { filterAnalysisForPlan };
