# Financial Wellness Survey (booth app)

Supernova's booth survey for iPads and phones. An advisor picks the event and their name, respondents
answer the Oct 2026 Financial Wellness Survey, and each survey is saved on the device and sent to Neon.
Every survey belongs to the advisor whose name was picked. The app never shows past surveys; advisors
will see their leads in their Logger, and the AD sees everything on `/admin`.

Last year's Medicard Lifestyle Center version is kept at `/medicard`.

## Environment

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon Postgres (added by Vercel's Neon integration). Tables are created on first use. |
| `SURVEY_PASSCODE` | Team passcode, entered once per device. |
| `ADMIN_PASSCODE` | The AD's passcode; opens `/admin` (events, all surveys, reassigning, CSV export). |
| `BIGBOARD_URL`, `BIGBOARD_TOKEN` | Big Board, for the advisor list (roster). |
| `LEADS_API_KEY` | Shared with the Loggers for `/api/leads` (server to server). |

## Pages

- `/` survey (setup on first use, then one survey after another)
- `/r#…` a respondent's Quick Result; the result travels in the link and is never stored
- `/privacy` privacy notice
- `/admin` AD only
