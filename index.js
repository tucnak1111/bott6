const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { PORT, DISCORD_TOKEN, DISCORD_GUILD_ID } = require('./src/config');

const app = express();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const VALID_ATTENDANCE_VALUES = new Set([
  'Present',
  'Absent - excused',
  'Absent - unauthorized',
  'Not Applicable',
]);

const recentAttendance = new Map();

module.exports = {
  app,
  client,
  VALID_ATTENDANCE_VALUES,
  isValidPayload,
  getAttendanceKey,
};
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

function isValidPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Payload must be a JSON object.' };
  }

  if (typeof payload.date !== 'string' || !payload.date.trim()) {
    return { valid: false, message: 'Field "date" is required and must be a non-empty string.' };
  }

  if (typeof payload.name !== 'string' || !payload.name.trim()) {
    return { valid: false, message: 'Field "name" is required and must be a non-empty string.' };
  }

  if (typeof payload.attendance !== 'string' || !VALID_ATTENDANCE_VALUES.has(payload.attendance)) {
    return {
      valid: false,
      message:
        'Field "attendance" is required and must be one of: Present, Absent - excused, Absent - unauthorized, Not Applicable.',
    };
  }

  if (payload.additionalNotes !== undefined && typeof payload.additionalNotes !== 'string') {
    return { valid: false, message: 'Field "additionalNotes" must be a string when provided.' };
  }

  return { valid: true };
}

function getAttendanceKey(date, name) {
  return `${String(date).trim()}::${String(name).trim()}`;
}

async function findDiscordUserByName(name) {
  if (!DISCORD_GUILD_ID) {
    throw new Error('DISCORD_GUILD_ID is not configured.');
  }

  const guild = await client.guilds.fetch(DISCORD_GUILD_ID).catch(() => null);
  if (!guild) {
    throw new Error(`Guild with id ${DISCORD_GUILD_ID} was not found.`);
  }

  const members = await guild.members.fetch({ query: name, limit: 5 });
  const matchingMember = members.find((member) => {
    const usernameMatches = member.user.username === name;
    const displayMatches = member.displayName === name;
    return usernameMatches || displayMatches;
  });

  if (!matchingMember) {
    return null;
  }

  return matchingMember.user;
}

async function sendAttendanceDM(user, payload, previousAttendance) {
  if (!user) {
    return { dmSent: false, reason: 'No matching Discord user found.' };
  }

  const message = [
    `Attendance update for ${payload.date}`,
    `Name: ${payload.name}`,
    `Attendance: ${payload.attendance}`,
    previousAttendance ? `Previous attendance: ${previousAttendance}` : 'Previous attendance: none',
    payload.additionalNotes ? `Additional notes: ${payload.additionalNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await user.send(message);
  return { dmSent: true };
}

app.post('/attendance', async (req, res) => {
  const validation = isValidPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ accepted: false, error: validation.message });
  }

  const payload = {
    date: req.body.date.trim(),
    name: req.body.name.trim(),
    attendance: req.body.attendance,
    additionalNotes: req.body.additionalNotes !== undefined ? req.body.additionalNotes.trim() : undefined,
  };

  const key = getAttendanceKey(payload.date, payload.name);
  const previousAttendance = recentAttendance.get(key) || null;
  const changeDetected = previousAttendance !== payload.attendance;

  recentAttendance.set(key, payload.attendance);

  let dmSent = false;
  let dmStatus = 'No DM sent because no matching Discord user was found.';

  try {
    const user = await findDiscordUserByName(payload.name);
    if (user) {
      const result = await sendAttendanceDM(user, payload, previousAttendance);
      dmSent = result.dmSent;
      dmStatus = result.dmSent ? 'DM sent successfully.' : result.reason || 'DM send failed.';
    }
  } catch (error) {
    dmStatus = `DM failed: ${error.message}`;
  }

  return res.status(202).json({
    accepted: true,
    status: 'accepted',
    date: payload.date,
    name: payload.name,
    attendance: payload.attendance,
    changeDetected,
    dmSent,
    message: 'Attendance payload accepted.',
    dmStatus,
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'attendance-discord-bot' });
});

async function start() {
  if (!DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN is missing. Add it to your .env file.');
    process.exit(1);
  }

  client.once('ready', () => {
    console.log(`Discord bot ready as ${client.user.tag}`);
  });

  await client.login(DISCORD_TOKEN);

  app.listen(PORT, () => {
    console.log(`Attendance API listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });
}
