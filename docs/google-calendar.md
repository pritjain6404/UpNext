# Google Calendar setup with Composio

UpNext uses Composio to manage the Google OAuth connection and execute a
read-only Google Calendar events query. The Composio API key stays server-side;
the browser receives only the upcoming event list.

## 1. Create a Composio project

1. Create an account at [Composio](https://app.composio.dev/).
2. Create or open a project.
3. Add the **Google Calendar** toolkit.
4. Use Composio's managed OAuth configuration, or create a Google Calendar
   OAuth auth config in Composio.
5. Copy the auth config ID. It usually begins with `ac_`.
6. Create/copy a Composio API key.

The Composio callback URL for the production deployment is:

`https://pritjain6404-probable-system.vercel.app/api/composio/callback`

In Composio, open **Settings → General → Configuration** and set this URL as
the project's callback identity verifier. UpNext redeems Composio's single-use
`session_uri` for the configured `COMPOSIO_USER_ID`; it no longer trusts a
connected-account ID supplied by the browser.

If you use a custom OAuth configuration, register that callback URL in the
configuration. With Composio-managed OAuth, use the callback URL requested by
the Composio dashboard and keep the UpNext callback as the post-connection
return URL if the dashboard exposes that option.

## 2. Add Vercel environment variables

In Vercel, open the UpNext project, choose **Settings → Environment Variables**,
and add these values for **Production**:

| Variable | Value |
| --- | --- |
| `COMPOSIO_API_KEY` | Your Composio project API key |
| `COMPOSIO_AUTH_CONFIG_ID` | The Google Calendar auth config ID, often `ac_...` |
| `COMPOSIO_USER_ID` | A stable UpNext user identifier, for example `upnext-owner` |
| `COMPOSIO_REDIRECT_URI` | `https://pritjain6404-probable-system.vercel.app/api/composio/callback` |

Never use a `VITE_` prefix for these variables. Do not paste the API key into
chat, source files, or screenshots.

The current app does not yet have user accounts. Therefore, the first version
uses the configured `COMPOSIO_USER_ID` for the deployment owner. Before opening
the app to multiple users, replace this with the authenticated UpNext user's
ID; otherwise all users would share one Composio connection.

## 3. Redeploy and connect

Redeploy Vercel after saving the variables. In UpNext:

1. Click **Connect Google Calendar**.
2. Complete Google's consent screen hosted through Composio.
3. Return to UpNext.
4. Click **Sync now**.

UpNext calls Composio's `GOOGLECALENDAR_EVENTS_LIST` action for the primary
calendar and requests timed events in the next 30 days. It does not create,
edit, or delete Google Calendar events.

## Troubleshooting

- **Not configured:** one or more Composio variables is missing, or the
  deployment was not redeployed.
- **Connection failed:** verify the auth config supports Google Calendar OAuth
  and that the callback/return URL is configured in Composio.
- **No events:** only timed events in the primary calendar and the next 30 days
  are shown; all-day events are intentionally excluded.
