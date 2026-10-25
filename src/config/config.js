const config = {
  provider: process.env.PROVIDER || "openai",
  map: {
    openai: {
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
    deepseek: {
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    },
    mistral: {
      baseURL: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
      apiKey: process.env.MISTRAL_API_KEY || "",
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
    },
    gemini: {
      baseURL:
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL,
    },
  },
};

module.exports = { config };
