# CV Evaluator — Backend

The API behind CV Evaluator. It turns resume text and job descriptions into structured feedback, so job seekers can spot missing skills and improve their applications without reviewing everything manually.

## API features

- Accept PDF, DOCX, and TXT resumes up to 5 MB, check file signatures, and extract text.
- Clean extracted resume text before sending it for analysis.
- Save resume sections, job context, provider details, and analysis results in MongoDB.
- Use database transactions when saving resumes and their analysis records.
- Reanalyze edited improvements with previous feedback as context.
- Keep up to three analysis versions per resume and remove older versions automatically.
- Return analysis history and comparisons of scores, skills, and other changes.
- List and search saved resumes, fetch details, and delete resumes with their analyses.
- Generate PDF reports, with content adjusted for the user's plan.
- Upload new files as authenticated Cloudinary raw assets and generate signed delivery URLs.
- Keep legacy Hetzner S3 upload helpers and route older-file deletion to S3.
- Clean up temporary uploads and attempt Cloudinary cleanup when a database save fails.
- Verify Clerk sessions and scope resume operations to the signed-in user.
- Filter analysis responses for free users and expose additional insights for Pro users.
- Create Stripe checkout and billing portal sessions; process subscription webhooks.
- Apply request limits, security headers, CORS, and input sanitization.

Scanned PDFs need OCR before uploading; OCR is not included.

## What the AI supports

- **Resume parsing:** personal information, summary, work experience, education, technical and soft skills, projects, certifications, awards, publications, volunteer work, and additional details.
- **Quality scoring:** overall score and separate structure, language, keyword, and experience scores.
- **Job-description matching:** job-fit score, keyword match, and skills alignment.
- **ATS coverage:** exact, partial, and stem matches, missing keywords with weights, and three priority actions.
- **Prioritized suggestions:** section-specific recommendations with priority levels and keyword-gap coverage.
- **Content improvements:** summary rewrites, experience bullets, project descriptions, grouped skills, education cleanup, and suggested section order.
- **Certification cleanup:** normalization and deduplication of certificate names and issuers.
- **Skill analysis:** missing skills, severity ratings, section impact scores, and supporting evidence.
- **Interview estimates:** probability, rationale, confidence, and contextual benchmarks.
- **Salary estimates:** regional ranges, currency, confidence, desired-salary context, and p25/p50/p75 percentiles.
- **Career guidance:** role progression, career accelerators, certification and course recommendations.
- **Market estimates:** regional demand, competition, hiring timing, demand drivers, growth trends, and rising skills.
- **Recruiter material:** pitch bullets, possible role shortlists, and requirements.
- **Hiring-manager mode:** decision summaries, red flags, and must-have skill coverage.
- **Context-aware analysis:** candidate or hiring-manager perspective, entry or professional level, region, industry, and target role.
- **Reanalysis:** carry forward relevant improvements, avoid duplicates, and update feedback when the resume or job description changes.

Prompts instruct the model to preserve existing facts and avoid invented employers, credentials, or achievement metrics. Results still need review. Salary, market, benchmark, and interview figures are model estimates; the API does not query a live salary or jobs database.

## AI providers and output

The backend has configurations for **Gemini, OpenAI, DeepSeek, and Mistral**, using the OpenAI SDK with each provider's endpoint. Set the provider, API key, and model through environment variables. The current frontend enables Gemini only.

Responses use JSON mode and are parsed and validated with Zod. The current code also requests JSON Schema structured output for its supported GPT-4o configuration; Gemini currently uses the JSON-mode branch. Retry handling covers rate limits and selected temporary API errors.

## Setup

Install Node.js LTS and Git. Use MongoDB Atlas or a local MongoDB replica set; a standalone MongoDB instance will not support the transactions used here.

### Accounts and credentials

| Service | What to create and copy |
| --- | --- |
| [MongoDB Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) | Create a project and cluster, add a database user with access to the app database, and allow your machine/server IP in Network Access. Copy the driver connection string, database username, and password. The database user is separate from your Atlas login. |
| [Clerk](https://clerk.com/docs/expressjs/getting-started/quickstart) | Create an application and get its **Publishable Key** and **Secret Key** from API keys. The frontend must use this same application's publishable key. |
| [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key) | Sign in with Google, create/select a project, and create a Gemini API key. Choose a model available to that project. |
| [Cloudinary](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials) | Create an account/product environment. Copy the cloud name, API key, and API secret from the console. In Security settings, enable **Allow delivery of PDF and ZIP files** for PDF links to work. |
| [Stripe](https://docs.stripe.com/products-prices/manage-prices) | Start in test mode/sandbox. Get the secret API key, create recurring USD prices at **$14.99/month** and **$99.00/year**, and copy both `price_...` IDs. Configure the customer portal for billing management. |
| Hetzner (existing files only) | Keep the original S3 endpoint, region, bucket, access key, and secret if the database contains older Hetzner files. A fresh Cloudinary setup does not need a Hetzner account. |

Stripe configuration is needed to run the current app because its Stripe clients are initialized when the backend starts.

### Run locally

```sh
git clone https://github.com/nurullah7733/cv-evaluator-ai-saas-backend.git
cd cv-evaluator-ai-saas-backend
npm install
cp .env.example .env
```

Fill in `.env` before starting. This example keeps MongoDB credentials separate, matching `app.js`:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000

DATABASE_URI=mongodb+srv://your-cluster.mongodb.net/cvevaluatordb?retryWrites=true&w=majority&authSource=admin
DATABASE_USER=your_database_username
DATABASE_PASS=your_database_password

CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRICE_MONTHLY=price_your_monthly_price_id
STRIPE_PRICE_YEARLY=price_your_yearly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

Replace every placeholder. `DATABASE_PASS` is the database user's password, not your Atlas account password. Use the same Stripe Price IDs in the frontend's `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_YEARLY`. The current checkout redirects to Stripe-hosted pages, so `STRIPE_PUBLISHABLE_KEY` is not used by this flow.

For legacy Hetzner files, also fill in `HETZNER_S3_ENDPOINT`, `HETZNER_S3_REGION`, `HETZNER_S3_BUCKET`, `HETZNER_S3_KEY`, and `HETZNER_S3_SECRET` from the original storage account.

### Stripe webhooks

Install the [Stripe CLI](https://docs.stripe.com/webhooks#local-listener), then run these commands in a separate terminal:

```sh
stripe login
stripe listen --events checkout.session.completed --forward-to localhost:4000/stripe-webhook
```

Copy the listener's `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, then start the backend:

```sh
npm run server
```

Keep the listener running while testing checkout. The current handler processes `checkout.session.completed`; the redirect alone does not activate Pro access. This handler does not yet synchronize renewals or subscription cancellations.

Check `http://localhost:4000/health` and confirm the database connection succeeds. Restart the backend after changing `.env`. To try another configured AI provider, supply its credentials and model in the backend configuration; the current frontend selector enables Gemini only.

### Production

Set the real frontend origin, allow the server IP in Atlas, and use matching production Clerk/Stripe credentials and Price IDs. Register `https://your-api-domain/stripe-webhook` in Stripe for `checkout.session.completed`, using a snapshot event payload, and set its signing secret in the server environment. The deployed endpoint secret is separate from the CLI listener secret. Configure the [Stripe customer portal](https://docs.stripe.com/customer-management/activate-no-code-customer-portal) in the same mode. Start with `npm start`.

Keep `.env` out of Git and keep all secret keys on the backend.

Pair with the [frontend](https://github.com/nurullah7733/cv-evaluator-ai-saas-frontend).

## Tech

Node.js, Express, MongoDB / Mongoose, Gemini via the OpenAI SDK, Zod, Cloudinary, Clerk, Stripe, and PDFKit.
