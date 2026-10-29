# TinkleMe

TinkleMe shows read-only Google Calendar events and open Google Tasks, and lets you schedule local browser reminders with a notification and a choice of three alarm sounds.

TinkleMe is free to use for this launch. The test checkout is not shown in the app, and the checkout API refuses requests on Vercel Production. Paid access is deferred until there is a defined Pro benefit, user accounts, and reliable purchase fulfillment.

Reminders are saved in this browser. Keep the page open until the reminder is due: closing the tab or device prevents browser-only sound and notifications. The Calendar view covers the next 90 days; the Tasks view shows up to 1,000 open tasks per connected account and warns if more exist.

Google Calendar and Google Tasks use separate Composio OAuth connections. Configure both read-only auth configs and the server-side variables in `.env.example`. Tasks require Google's `tasks.readonly` scope; the all-calendars view also needs Calendar list access (`calendar.calendarlist.readonly`) in addition to event read access. After adding scopes, reconnect the affected Google account. Do not put Composio secrets in `VITE_` variables or commit them.

Connect each Google account to Calendar and Tasks separately in the same browser to see both accounts together. Connections are stored in signed, browser-specific cookies; another visitor does not inherit them. If a connection stops loading, remove only that failed account in the relevant card, then reconnect it. Existing single-account cookies from older UpNext versions must be reconnected after this update. Google OAuth in Testing mode still limits new connections to approved test users; making the site public does not remove Google's test-user restriction.
