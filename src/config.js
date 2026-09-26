require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || '',
};
