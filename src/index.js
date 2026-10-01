import {
  Client, GatewayIntentBits, PermissionFlagsBits, ChannelType,
  REST, Routes, SlashCommandBuilder, EmbedBuilder
} from 'discord.js';

const { DISCORD_TOKEN, GUILD_ID, APPLICATION_ID } = process.env;
if (!DISCORD_TOKEN || !GUILD_ID || !APPLICATION_ID) {
  console.error('Missing DISCORD_TOKEN, GUILD_ID, or APPLICATION_ID.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const roles = [
  ['Founder', PermissionFlagsBits.Administrator],
  ['Lead Developer', 0n], ['Developer', 0n], ['Artist', 0n], ['VFX Artist', 0n], ['Builder', 0n],
  ['QA Lead', 0n], ['Playtester', 0n], ['Head Moderator', 0n], ['Moderator', 0n],
  ['Community Manager', 0n], ['Content Creator', 0n], ['Partner', 0n], ['Early Supporter', 0n],
  ['Top', 0n], ['Jungle', 0n], ['Mid', 0n], ['ADC', 0n], ['Support', 0n],
  ['EU', 0n], ['NA', 0n], ['Asia', 0n], ['Announcements', 0n], ['Playtest Pings', 0n], ['Update Pings', 0n]
];

const categories = [
  ['START HERE', ['welcome','rules','roles','faq']],
  ['RFG', ['announcements','sneak-peaks','patch-notes','general','lfg','media']],
  ['FEEDBACK & SUPPORT', ['support','bug-reports','suggestions','balance-feedback']],
  ['TESTING', ['tester-news','playtest-chat','qa-tasks']],
  ['DEVELOPMENT', ['dev-chat','dev-tasks','dev-assets']],
  ['STAFF', ['staff-chat','mod-log']]
];

const staffNames = ['Founder','Head Moderator','Moderator','Community Manager'];
const devNames = ['Founder','Lead Developer','Developer','Artist','VFX Artist','Builder'];
const testerNames = ['Founder','Lead Developer','QA Lead','Playtester'];

async function ensureRole(guild, name, permissions) {
  let role = guild.roles.cache.find(r => r.name === name);
  if (!role) role = await guild.roles.create({ name, permissions, reason: 'RFG one-time setup' });
  return role;
}

async function ensureCategory(guild, name, privateRoles = null) {
  let c = guild.channels.cache.find(x => x.type === ChannelType.GuildCategory && x.name === name);
  if (!c) {
    const permissionOverwrites = privateRoles ? [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...privateRoles.map(r => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
    ] : [];
    c = await guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites, reason: 'RFG one-time setup' });
  }
  return c;
}

async function ensureText(guild, category, name) {
  let ch = guild.channels.cache.find(x => x.type === ChannelType.GuildText && x.name === name);
  if (!ch) ch = await guild.channels.create({ name, type: ChannelType.GuildText, parent: category.id, reason: 'RFG one-time setup' });
  else if (ch.parentId !== category.id) await ch.setParent(category.id, { lockPermissions: true }).catch(() => {});
  return ch;
}

const messages = {
  welcome: ['Welcome to RFG', 'Welcome to the official RFG community. Start with #rules, choose your roles in #roles, then jump into the community.'],
  rules: ['RFG Rules', 'Respect other members. No harassment, hate speech, spam, scams, NSFW content, malicious links, impersonation, or disruptive behavior. Follow Discord Terms of Service and staff instructions.'],
  roles: ['Choose Your Roles', 'Pick the game position, region, and notification roles that fit you. Staff can help if you need a role changed.'],
  faq: ['RFG FAQ', 'Use #support for help, #bug-reports for reproducible bugs, #suggestions for ideas, and #lfg to find players.'],
  announcements: ['RFG Announcements', 'Official RFG news, milestones, events, and important notices will be posted here.'],
  'sneak-peaks': ['RFG Sneak Peeks', 'Public previews of upcoming characters, maps, effects, systems, and other development progress.'],
  'patch-notes': ['RFG Patch Notes', 'Release notes, fixes, balance changes, and new features will be documented here.'],
  support: ['RFG Support', 'Describe what you need help with clearly. Do not post passwords, tokens, recovery codes, or other private credentials.'],
  'tester-news': ['Tester News', 'Playtest schedules, test objectives, and tester-specific announcements will appear here.'],
  'dev-chat': ['Development', 'Private development coordination for the RFG team. Keep unreleased assets and internal information inside the development area.']
};

async function seed(ch, key) {
  if (!messages[key]) return;
  const recent = await ch.messages.fetch({ limit: 10 }).catch(() => null);
  if (recent?.some(m => m.author.id === client.user.id && m.embeds?.[0]?.title === messages[key][0])) return;
  await ch.send({ embeds: [new EmbedBuilder().setTitle(messages[key][0]).setDescription(messages[key][1]).setColor(0x2b2d31)] });
}

async function setupGuild(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  const roleMap = new Map();
  for (const [name, perms] of roles) roleMap.set(name, await ensureRole(guild, name, perms));
  const pick = names => names.map(n => roleMap.get(n)).filter(Boolean);

  for (const [catName, chans] of categories) {
    let access = null;
    if (catName === 'STAFF') access = pick(staffNames);
    if (catName === 'DEVELOPMENT') access = pick(devNames);
    if (catName === 'TESTING') access = pick(testerNames);
    const cat = await ensureCategory(guild, catName, access);
    for (const name of chans) {
      const ch = await ensureText(guild, cat, name);
      await seed(ch, name);
      await sleep(200);
    }
  }
  return { roleCount: roles.length, categoryCount: categories.length, channelCount: categories.reduce((n,c) => n + c[1].length, 0) };
}

const commands = [new SlashCommandBuilder()
  .setName('setup-rfg')
  .setDescription('Create or repair the RFG Discord server structure')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .toJSON()];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands });
  console.log('Registered /setup-rfg. Run it in the target Discord server.');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'setup-rfg') return;
  if (interaction.guildId !== GUILD_ID) return interaction.reply({ content: 'This setup bot is locked to the configured RFG server.', ephemeral: true });
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission is required.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await setupGuild(interaction.guild);
    await interaction.editReply(`RFG setup complete. ${result.roleCount} roles, ${result.categoryCount} categories and ${result.channelCount} channels were checked/created. Existing matching items were reused.`);
  } catch (e) {
    console.error(e);
    await interaction.editReply(`Setup stopped: ${e.message}`);
  }
});

client.login(DISCORD_TOKEN);
