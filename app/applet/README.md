# COMANINS

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Gemini in production

The exported server reads `GEMINI_API_KEY` from the process environment and also loads `.env.local` / `.env` without overriding environment variables. In Hostinger, Cloud Run or another production host, configure `GEMINI_API_KEY` as a server-side secret/environment variable and restart the service. Never expose this key through `VITE_*` variables or browser code.

Optional: set `GEMINI_VISION_MODEL=gemini-3.8-flash` for the post-laboratory photo validator. Authenticated internal users can call `/api/ai/status` to verify whether the server sees the Gemini secret; the endpoint never returns the key itself.
