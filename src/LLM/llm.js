const OpenAI = require("openai");
const { config } = require("../config/config");
const path = require("path");
const fs = require("fs");

const resumeAnalysisSchemaString = fs.readFileSync(
  path.join(__dirname, "./promptOutputSchema.json"),
  "utf8"
);
const resumeAnalysisSchema = JSON.parse(resumeAnalysisSchemaString);
// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE_STATUSES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524,
]);
const isRetryable = (err) => {
  const s = err?.status || err?.code || err?.response?.status;
  return RETRYABLE_STATUSES.has(Number(s));
};

const getHeaders = (errOrResp) => {
  return (
    errOrResp?.headers ||
    errOrResp?.response?.headers ||
    errOrResp?.error?.headers ||
    {}
  );
};

const getRetryAfterSeconds = (err) => {
  const h = getHeaders(err);
  const ra = h["retry-after"] || h["Retry-After"];
  if (!ra) return null;
  const sec = parseInt(String(ra), 10);
  return Number.isFinite(sec) ? Math.min(Math.max(sec, 1), 60) : null;
};

// ---------- client ----------
function getClient(using) {
  const provider = using || config.provider;
  const conf = config.map[provider];
  if (!conf?.apiKey)
    throw new Error(`Missing API key for provider: ${provider}`);
  return {
    provider,
    model: conf.model,
    client: new OpenAI({ apiKey: conf.apiKey, baseURL: conf.baseURL }),
  };
}

// ---------- main ----------
async function chatGenerate({
  messages,
  use,
  temperature = 0.2,
  maxTokens = 7000,
  retries = 4,
  baseDelayMs = 1000,
  onRetry = null,
  useStructuredOutput = false,
}) {
  const { client, model, provider } = getClient(use);

  let attempt = 0;

  while (true) {
    try {
      // ✅ NEW: Check if OpenAI + structured outputs requested
      const shouldUseStructuredOutput =
        provider === "openai" &&
        useStructuredOutput &&
        (model === "gpt-4o-2024-08-06" || model === "gpt-4o");

      let resp;

      if (shouldUseStructuredOutput) {
        // ✅ OpenAI Structured Outputs (guaranteed schema match)
        resp = await client.chat.completions.create({
          model: "gpt-4o-2024-08-06", // Force this model for structured outputs
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "resume_analysis",
              strict: true,
              schema: resumeAnalysisSchema,
            },
          },
        });
      } else {
        // ✅ Normal JSON mode (for DeepSeek, Mistral, or OpenAI without structured output)
        resp = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        });
      }

      const text = resp?.choices?.[0]?.message?.content?.trim() || "";
      const usage = resp?.usage || null;

      return {
        provider,
        model: shouldUseStructuredOutput ? "gpt-4o-2024-08-06" : model,
        text,
        usage,
        structuredOutput: shouldUseStructuredOutput, // ✅ NEW: Flag to indicate if structured output was used
      };
    } catch (err) {
      const status = err?.status || err?.response?.status || "unknown";
      const headers = getHeaders(err);

      if (!isRetryable(err) || attempt >= retries) {
        const e = new Error(`chatGenerate failed (status=${status})`);
        e.status = status;
        e.headers = headers;
        e.cause = err;
        throw e;
      }

      const retryAfterSec = getRetryAfterSeconds(err);
      const jitter = Math.floor(Math.random() * 300); // 0–300ms
      const waitMs = retryAfterSec
        ? retryAfterSec * 1000
        : baseDelayMs * Math.pow(2, attempt) + jitter;

      if (typeof onRetry === "function") {
        try {
          onRetry({
            attempt,
            status,
            waitMs,
            retryAfterSec: retryAfterSec ?? null,
            headers,
          });
        } catch (_) {}
      }

      await sleep(waitMs);
      attempt += 1;
    }
  }
}

module.exports = { chatGenerate, getClient };
