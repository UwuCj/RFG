import http from 'node:http';
import {
  Client, GatewayIntentBits, PermissionFlagsBits, ChannelType,
  REST, Routes, SlashCommandBuilder, EmbedBuilder
} from 'discord.js';

const { DISCORD_TOKEN, GUILD_ID, APPLICATION_ID } = process.env;
if (!DISCORD_TOKEN || !GUILD_ID || !APPLICATION_ID) process.exit(1);

// Render web services require an open HTTP port. The Discord bot itself uses
// the gateway connection; this tiny endpoint only keeps Render's web service healthy.
const port = Number(process.env.PORT || 10000);
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ service: 'rfg-discord-setup', online: client?.isReady?.() ?? false }));
}).listen(port, '0.0.0.0', () => console.log(`Health server listening on ${port}`));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BRAND = 0x9b5cff;
const BANNER = process.env.RFG_BANNER_URL || '';
const roles = [
 ['Founder',0xff3b5c,PermissionFlagsBits.Administrator],['Lead Developer',0x8b5cf6,0n],['Developer',0x5865f2,0n],['Artist',0xff77c8,0n],['VFX Artist',0xc56cff,0n],['Builder',0xf59e0b,0n],
 ['QA Lead',0x22d3ee,0n],['Playtester',0x38bdf8,0n],['Head Moderator',0xed4245,0n],['Moderator',0xf87171,0n],['Community Manager',0x57f287,0n],['Content Creator',0xf472b6,0n],['Partner',0xfacc15,0n],['Early Supporter',0xfbbf24,0n],
 ['Top',0xef4444,0n],['Jungle',0x22c55e,0n],['Mid',0xa855f7,0n],['ADC',0xf59e0b,0n],['Support',0x06b6d4,0n],['EU',0x3b82f6,0n],['NA',0xdc2626,0n],['Asia',0xec4899,0n],['Announcements',0xf97316,0n],['Playtest Pings',0x14b8a6,0n],['Update Pings',0x6366f1,0n]
];
const categories=[['WELCOME',['welcome','rules','roles','faq']],['RFG // HUB',['announcements','sneak-peaks','patch-notes','general','lfg','media']],['COMMUNITY LAB',['support','bug-reports','suggestions','balance-feedback']],['PLAYTESTING',['tester-news','playtest-chat','qa-tasks']],['RFG DEVELOPMENT',['dev-chat','dev-tasks','dev-assets']],['STAFF HQ',['staff-chat','mod-log']]];
const staffNames=['Founder','Head Moderator','Moderator','Community Manager'];
const devNames=['Founder','Lead Developer','Developer','Artist','VFX Artist','Builder'];
const testerNames=['Founder','Lead Developer','QA Lead','Playtester'];
async function ensureRole(guild,name,color,permissions){let role=guild.roles.cache.find(r=>r.name===name);if(!role)role=await guild.roles.create({name,color,permissions,reason:'RFG setup'});else await role.edit({color,permissions:permissions||role.permissions.bitfield,reason:'RFG visual refresh'}).catch(()=>{});return role;}
async function ensureCategory(guild,name,privateRoles=null){let c=guild.channels.cache.find(x=>x.type===ChannelType.GuildCategory&&x.name===name);const overwrites=privateRoles?[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},...privateRoles.map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))]:[];if(!c)c=await guild.channels.create({name,type:ChannelType.GuildCategory,permissionOverwrites:overwrites,reason:'RFG setup'});else if(privateRoles)await c.permissionOverwrites.set(overwrites).catch(()=>{});return c;}
async function ensureText(guild,category,name){let ch=guild.channels.cache.find(x=>x.type===ChannelType.GuildText&&x.name===name);if(!ch)ch=await guild.channels.create({name,type:ChannelType.GuildText,parent:category.id,reason:'RFG setup'});else if(ch.parentId!==category.id)await ch.setParent(category.id,{lockPermissions:true}).catch(()=>{});return ch;}
const cards={
 welcome:{title:'WELCOME TO RFG',desc:'**A competitive battleground built from the ground up.**\n\nThis is the home of RFG development, playtests, reveals and the community shaping the game.\n\n**GET STARTED**\n`01` Read the rules\n`02` Build your identity in the roles channel\n`03` Watch public development in sneak-peaks\n`04` Find a squad in LFG',color:0x9b5cff,image:true,footer:'RFG // ENTER THE RIFT'},
 rules:{title:'RFG // CODE OF CONDUCT',desc:'**Respect the arena. Respect the players.**\n\n`01` Keep discussion respectful — no harassment or hate.\n`02` No spam, scams, malicious links or impersonation.\n`03` Keep content safe for the community.\n`04` Don’t leak private tester or development material.\n`05` Use channels for their intended purpose.\n`06` Follow Discord Terms and reasonable staff direction.',color:0xed4245,footer:'RFG STAFF // FAIR PLAY FIRST'},
 roles:{title:'BUILD YOUR RFG IDENTITY',desc:'**Your lane. Your region. Your alerts.**\n\n**POSITIONS**\n`TOP` Solo pressure and frontline\n`JUNGLE` Control the map\n`MID` Tempo and playmaking\n`ADC` Late-game damage\n`SUPPORT` Vision and setup\n\n**REGIONS**  `EU`  `NA`  `ASIA`\n\n**NOTIFICATIONS**\n`Announcements` • major news\n`Playtest Pings` • testing sessions\n`Update Pings` • patches and releases',color:0x5865f2,footer:'RFG // CHOOSE YOUR PATH'},
 faq:{title:'RFG // QUICK GUIDE',desc:'Bug with clear reproduction → **bug-reports**\nNew feature idea → **suggestions**\nBalance discussion → **balance-feedback**\nNeed help → **support**\nLooking for teammates → **lfg**\nClips / creations → **media**',color:0x22d3ee,footer:'RFG // KNOW THE MAP'},
 announcements:{title:'RFG // TRANSMISSION',desc:'Major announcements, milestones, events and release information land here. Turn on **Announcements** if you want the important stuff without the noise.',color:0xf97316,image:true,footer:'OFFICIAL RFG NEWS'},
 'sneak-peaks':{title:'RFG // DEVELOPMENT FEED',desc:'**See it before it ships.**\n\nCharacters. Combat. VFX. Maps. UI. Experiments. This is the public window into RFG development. Some previews are work-in-progress and may change before release.',color:0xc56cff,image:true,footer:'WORK IN PROGRESS // SUBJECT TO CHANGE'},
 'patch-notes':{title:'RFG // PATCH ARCHIVE',desc:'Every meaningful update gets documented here: **new content, balance changes, fixes and system improvements.**',color:0x57f287,footer:'BUILD → TEST → SHIP → REPEAT'},
 support:{title:'RFG // SUPPORT DESK',desc:'Need help? Explain the issue clearly and include useful context.\n\n**Never post** passwords, bot tokens, recovery codes or other private credentials.',color:0x38bdf8,footer:'RFG SUPPORT'},
 'tester-news':{title:'RFG // TEST OPERATIONS',desc:'Private testing schedules, objectives, build notes and priorities appear here. Tester material stays inside the testing area unless staff says otherwise.',color:0x14b8a6,footer:'BREAK IT BEFORE PLAYERS DO'},
 'dev-chat':{title:'RFG // DEVELOPMENT HQ',desc:'Internal coordination for the RFG team. Keep unreleased assets, implementation details and private roadmap information inside development channels.',color:0x8b5cf6,footer:'DESIGN // BUILD // POLISH'}
};
function buildEmbed(card){const e=new EmbedBuilder().setTitle(card.title).setDescription(card.desc).setColor(card.color??BRAND).setFooter({text:card.footer??'RFG'}).setTimestamp();if(card.image&&/^https?:\/\//.test(BANNER))e.setImage(BANNER);return e;}
async function seed(ch,key){const card=cards[key];if(!card)return;const recent=await ch.messages.fetch({limit:25}).catch(()=>null);const old=recent?.find(m=>m.author.id===client.user.id&&Object.values(cards).some(c=>c.title===m.embeds?.[0]?.title));if(old)await old.edit({embeds:[buildEmbed(card)]}).catch(()=>{});else await ch.send({embeds:[buildEmbed(card)]});}
async function setupGuild(guild){await guild.roles.fetch();await guild.channels.fetch();const roleMap=new Map();for(const [name,color,perms]of roles)roleMap.set(name,await ensureRole(guild,name,color,perms));const pick=names=>names.map(n=>roleMap.get(n)).filter(Boolean);for(const[catName,chans]of categories){let access=null;if(catName==='STAFF HQ')access=pick(staffNames);if(catName==='RFG DEVELOPMENT')access=pick(devNames);if(catName==='PLAYTESTING')access=pick(testerNames);const cat=await ensureCategory(guild,catName,access);for(const name of chans){const ch=await ensureText(guild,cat,name);await seed(ch,name);await sleep(150);}}return{roleCount:roles.length,categoryCount:categories.length,channelCount:categories.reduce((n,c)=>n+c[1].length,0)};}
const commands=[new SlashCommandBuilder().setName('setup-rfg').setDescription('Create or refresh the premium RFG server design').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON()];
client.once('clientReady',async()=>{console.log(`Logged in as ${client.user.tag}`);try{const rest=new REST({version:'10'}).setToken(DISCORD_TOKEN);await rest.put(Routes.applicationGuildCommands(APPLICATION_ID,GUILD_ID),{body:commands});console.log('Registered /setup-rfg');}catch(e){console.error('Command registration failed:',e.message);}});
client.on('interactionCreate',async interaction=>{if(!interaction.isChatInputCommand()||interaction.commandName!=='setup-rfg')return;if(interaction.guildId!==GUILD_ID)return interaction.reply({content:'Wrong server.',flags:64});if(!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))return interaction.reply({content:'Administrator permission required.',flags:64});await interaction.deferReply({flags:64});try{const r=await setupGuild(interaction.guild);await interaction.editReply(`RFG refresh complete — ${r.roleCount} roles, ${r.categoryCount} categories and ${r.channelCount} channels checked.`);}catch(e){console.error(e);await interaction.editReply(`Setup stopped: ${e.message}`);}});
client.login(DISCORD_TOKEN);
