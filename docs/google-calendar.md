# Google Calendar setup

UpNext uses Google OAuth with the read-only Calendar scope. Google credentials
stay in Vercel server environment variables; the browser receives only a
short-lived list of upcoming events.

## 1. Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Google Calendar API**.
4. Configure the OAuth consent screen. For a private test, choose **External**,
   add your own Google account as a test user, and request only the
   `https://www.googleapis.com/auth/calendar.readonly` scope.
5. Create an OAuth client of type **Web application**.
6. Add this authorized redirect URI:

   `https://pritjain6404-probable-system.vercel.app/api/google/callback`

   If the Vercel domain changes, add the new URL as well. The URL must match
   exactly, including `https`, path, and capitalization.

## 2. Add Vercel environment variables

In Vercel, open the UpNext project, choose **Settings → Environment Variables**,
and add these values for **Production** (and Preview if you want to test there):

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client secret from Google Cloud |
| `GOOGLE_OAUTH_SECRET` | A long random secret used to encrypt OAuth cookies |
| `GOOGLE_REDIRECT_URI` | `https://pritjain6404-probable-system.vercel.app/api/google/callback` |

Do not add these variables with a `VITE_` prefix and do not paste them into
chat, source files, or screenshots.

## 3. Redeploy and connect

Redeploy the Vercel project after saving the variables. In UpNext, click
**Connect Google Calendar**, sign in, approve read-only access, and return to
the app. Click **Sync now** to load primary-calendar events in the next 30
days.

The current integration is intentionally read-only. It displays calendar
events but does not create, edit, or delete Google Calendar events. Reminder
phone and emergency-contact safeguards still need to be completed in UpNext
before an imported event can enter the escalation flow.

## Troubleshooting

- **Not configured:** one or more Vercel variables is missing, or the deployment
  was not redeployed after adding them.
- **Redirect URI mismatch:** the Google Cloud callback URL is not an exact match
  for `GOOGLE_REDIRECT_URI`.
- **Access blocked:** the Google account is not listed as a test user while the
  OAuth consent screen is in testing.
- **No events:** only timed events in the primary calendar and the next 30 days
  are shown; all-day events are intentionally excluded.
