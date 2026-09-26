# Attendance Discord Bot

This project accepts attendance updates via an HTTP POST endpoint and matches the submitted `name` value to a Discord username in the configured guild. When the attendance status changes for the same date and name, the bot sends a direct message to the matching Discord user.

## Features

- Accepts attendance payloads from a webhook or backend service
- Validates required payload fields and allowed attendance values
- Finds a matching Discord user by username
- Sends a DM when the attendance status changes for the same date/name pair
- Returns an HTTP 202 response when the payload is accepted

## Payload format

```json
{
  "date": "September 2026",
  "name": "PixelNova9001",
  "attendance": "Present",
  "additionalNotes": "Optional note"
}
```

Allowed attendance values:

- `Present`
- `Absent - excused`
- `Absent - unauthorized`
- `Not Applicable`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in your Discord bot token and guild ID in `.env`.

4. Start the server:

   ```bash
   npm start
   ```

## Endpoint

- `POST /attendance`

### Example request

```bash
curl -X POST http://localhost:3000/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "date": "September 2026",
    "name": "PixelNova9001",
    "attendance": "Present",
    "additionalNotes": "Optional note"
  }'
```

### Example response

```json
{
  "accepted": true,
  "status": "accepted",
  "date": "September 2026",
  "name": "PixelNova9001",
  "attendance": "Present",
  "changeDetected": false,
  "dmSent": false,
  "message": "Attendance payload accepted."
}
```

## Discord bot permissions

The bot needs the following permissions in the target guild:

- View Channels
- Read Messages/View Channels
- Send Messages
- Read Message History (optional for some admin flows)
- Access to direct messages via the bot account

## Deployment notes

Make sure the bot is invited to the server using a URL like this:

```text
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot
```

Then set `DISCORD_GUILD_ID` to a guild where the usernames you want to match exist.
