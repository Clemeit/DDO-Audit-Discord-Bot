const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { defaultprefix, token } = require("./config.json");
const fs = require("fs");
const Verbose = require("./verbose");
const Render = require("./render");
const client = new Discord.Client();
const fetch = require("node-fetch");
const { performance } = require("perf_hooks");

var API = require("node-rest-client").Client;

const SERVERS = [
	"Argonnessen",
	"Cannith",
	"Ghallanda",
	"Khyber",
	"Orien",
	"Sarlona",
	"Thelanis",
	"Wayfinder",
	"Hardcore",
];

const SERVERS_LOWERCASE = [
	"argonnessen",
	"cannith",
	"ghallanda",
	"khyber",
	"orien",
	"sarlona",
	"thelanis",
	"wayfinder",
	"hardcore",
];

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity("Dungeons & Dragons Online");
});

client.on("message", (message) => {
	Verbose.onError(message);
	Verbose.handleUserReply(message);
	if (message.author.bot) return; // Don't respond to bots

	// Add the default prefix to this guild's data:
	let prefixes = JSON.parse(fs.readFileSync("./prefixes.json"));
	if (!prefixes[message.guild.id]) {
		prefixes[message.guild.id] = {
			prefix: defaultprefix,
		};
		fs.writeFile("./prefixes.json", JSON.stringify(prefixes), (err) => {
			if (err) console.log(err);
		});
	}
	let prefix = prefixes[message.guild.id].prefix; // Load prefix from file

	if (!message.content.startsWith(prefix)) return; // Prefix doesn't match

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	switch (command) {
		case "groups":
		case "lfms":
		case "view":
			if (args.length == 0) {
				message.reply(
					"Which server do you want to check groups for? Example: `!" +
						command +
						" Thelanis`"
				);
				return;
			}
			var serverName = args.shift().toLowerCase();
			postGroups(message, serverName, prefix);
			deleteUserMessage(message);
			break;
		case "serverpop":
		case "population":
			postPopulation(message, prefix);
			break;
		case "serverstatus":
			postServerStatus(message);
			break;
		case "auditprefix":
			changePrefix(message, prefix);
			break;
	}
});

function changePrefix(message, prefix) {
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift();
	const newprefix = args.shift();

	if (!message.member.hasPermission("MANAGE_GUILD")) {
		message.reply(
			`You need the 'MANAGE_GUILD' permission to run this command.`
		);
		return;
	}

	if (!newprefix) {
		message.reply(
			`You may enter a new prefix, e.g. \`${prefix}auditprefix ?\``
		);
		return;
	}

	let prefixes = JSON.parse(fs.readFileSync("./prefixes.json"));
	if (!prefixes[message.guild.id]) {
		prefixes[message.guild.id] = {
			prefix: newprefix,
		};
	}
	prefixes[message.guild.id] = {
		prefix: newprefix,
	};

	fs.writeFile("./prefixes.json", JSON.stringify(prefixes), (err) => {
		if (err) {
			console.log(err);
			message.reply(`Unable to set new prefix. Try again.`);
			return;
		}
	});

	message.reply(`You set the prefix to \`${newprefix}\``);
}

function deleteUserMessage(message) {
	// Delete the user's command message
	message
		.delete()
		.then(() => {
			console.log(" -> Deleted user message");
		})
		.catch((err) => {
			console.log(` -> Failed to delete a message: ${err}`);
		});
}

function fixServerName(input) {
	if (input == null) return "";
	switch (input.toLowerCase()) {
		case "a":
		case "argo":
		case "argonesen":
		case "argonnesen":
		case "argonessen":
		case "argonnessen":
			return "argonnessen";
		case "c":
		case "canith":
		case "cannith":
			return "cannith";
		case "g":
		case "galanda":
		case "gallanda":
		case "ghalanda":
		case "ghallanda":
			return "ghallanda";
		case "k":
		case "kyber":
		case "khyber":
			return "khyber";
		case "o":
		case "orion":
		case "orien":
			return "orien";
		case "s":
		case "sarlona":
			return "sarlona";
		case "t":
		case "thelanis":
			return "thelanis";
		case "w":
		case "wayfarer":
		case "wayfinder":
			return "wayfinder";
		case "h":
		case "hcl":
		case "hardcore":
			return "hardcore";
	}
	return "";
}

async function postGroups(message, serverName, prefix) {
	let startTime = performance.now();
	let servername = fixServerName(serverName);

	let lowerlevel = undefined;
	let upperlevel = undefined;
	let namefilter = "";
	let difficultyfilter = "";
	let searchtype = "none";
	let large = false;

	let shouldSave = message.content.toLowerCase().endsWith("save");

	let levelregex = /(?<low>\d+)(-(?<high>\d+))?/;
	let nameregex = /(?<name>[\w-]+)/;
	const difficulties = ["casual", "normal", "hard", "elite", "reaper"];

	const args = message.content
		.slice(prefix.length)
		.trim()
		.slice(
			0,
			shouldSave ? message.content.length - 5 : message.content.length - 1
		)
		.trim()
		.split(/ +/);
	const command = args.shift().toLowerCase();
	const server = args.shift().toLowerCase();
	let filter = args.shift();
	if (filter != null && filter.length > 0) {
		filter = filter.toLowerCase();
		if (levelregex.test(filter)) {
			searchtype = "level";
			const {
				groups: { low, high },
			} = levelregex.exec(filter);
			if (low != null) lowerlevel = low;
			if (high != null) upperlevel = high;
		} else if (difficulties.includes(filter)) {
			searchtype = "difficulty";
			difficultyfilter = filter;
		} else if (filter === "large") {
			searchtype = "none";
			large = true;
		} else if (nameregex.test(filter)) {
			searchtype = "name";
			const {
				groups: { name },
			} = nameregex.exec(filter);
			namefilter = name;
		}
	}

	if (upperlevel < lowerlevel) {
		let temp = lowerlevel;
		lowerlevel = upperlevel;
		upperlevel = temp;
	}

	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested '${command}' for '${servername} ("${serverName}")' at '${message.createdAt}'`
	);

	if (servername === "") {
		message.reply(`I don't recognize that server.`);
		return;
	}

	var groups = [];

	try {
		let serverdownmessage = "";

		const { Groups } = await fetch(
			`https://www.playeraudit.com/api/groups?s=${servername}`
		).then((response) => response.json());
		Groups.forEach(function (group) {
			if (group.Quest == null) group.Quest = { Name: "" };
			if (group.Leader.Name === "DDO Audit") {
				serverdownmessage = group.Comment;
			} else {
				switch (searchtype) {
					case "level":
						if (upperlevel !== undefined) {
							if (
								(group.MinimumLevel <= upperlevel &&
									group.MinimumLevel >= lowerlevel) ||
								(group.MaximumLevel <= upperlevel &&
									group.MaximumLevel >= lowerlevel)
							)
								groups.push(group);
						} else {
							if (
								lowerlevel >= group.MinimumLevel &&
								lowerlevel <= group.MaximumLevel
							)
								groups.push(group);
						}
						break;
					case "name":
						if (
							group.Leader.Name.toLowerCase().includes(
								namefilter.toLowerCase()
							)
						) {
							groups.push(group);
						}
						break;
					case "difficulty":
						if (group.Difficulty.toLowerCase() === difficultyfilter) {
							groups.push(group);
						}
						break;
					default:
						groups.push(group);
				}
			}
		});

		let additionalmessage = "";
		switch (searchtype) {
			case "level":
				if (upperlevel == null) {
					additionalmessage = ` **at level ${lowerlevel}**`;
				} else {
					additionalmessage = ` **for levels ${lowerlevel}-${upperlevel}**`;
				}
				break;
			case "name":
				additionalmessage = ` **with ${
					groups.length === 1 ? "a" : ""
				} leader${
					groups.length === 1 ? "" : "s"
				} matching the name "${namefilter}"**`;
				break;
			case "difficulty":
				additionalmessage = ` **running ${difficultyfilter} difficulty**`;
				break;
			default:
		}

		let servicemessage = "";
		if (
			serverdownmessage ===
			"The server appears to be online, but we've lost connection. We'll be back soon."
		) {
			servicemessage =
				"*Group data takes at least 5 minutes to update after a restart*\n";
		}

		groups.reverse();
		if (groups.length == 0) {
			let msg =
				servicemessage +
				"There are currently no groups on " +
				servername.charAt(0).toUpperCase() +
				servername.slice(1) +
				additionalmessage +
				"." +
				(serverdownmessage ? "\n*Message: " + serverdownmessage + "*" : "");
			message.channel.send(msg).then((msg) => {
				msg.delete({ timeout: 1000 * 60 * 5 });
			});

			let endTime = performance.now();
			console.log(
				` -> Served message: '${msg}'; took ${endTime - startTime} ms`
			);
			return;
		}

		let alsotrymessage = "";
		let rnd = Math.floor(Math.random() * 10);
		if (!shouldSave) {
			if (rnd === 0) {
				alsotrymessage = `\n(you may also specify a level like \`${message.content} 17\`)`;
			} else if (rnd === 1) {
				alsotrymessage = `\n(you may also specify a level range like \`${message.content} 17-20\`)`;
			} else if ((rnd === 2 || rnd === 3) && command !== "view") {
				alsotrymessage = `\n(you can view a screenshot of the LFM panel with \`!view servername\`)`;
			}
		}

		message.channel
			.send(
				`There ${groups.length == 1 ? "is" : "are"} currently ${
					groups.length
				} group${groups.length == 1 ? "" : "s"} on ${
					servername.charAt(0).toUpperCase() + servername.slice(1)
				}${additionalmessage || alsotrymessage}:`
			)
			.then((msg) => {
				if (!shouldSave) {
					msg.delete({ timeout: 1000 * 60 * 5 });
				}
			});

		if (command === "lfms" || command === "groups") {
			await sendGroupsAsList(message, groups, servername).then((msg) => {
				if (!shouldSave) {
					msg.delete({ timeout: 1000 * 60 * 5 });
				}
			});
		} else if (command === "view") {
			await Render.sendGroupsAsPanel(message, groups, large)
				.then((msg) => {
					if (!shouldSave) {
						msg.delete({ timeout: 1000 * 60 * 5 });
					}
				})
				.catch((err) => {
					if (err.code === 50013) {
						message
							.reply(
								"I don't have permission to send images in this channel."
							)
							.then((msg) => {
								msg.delete({ timeout: 1000 * 60 * 5 });
							});
					}
				});
		}

		await Verbose.followup(message, 2, shouldSave).then((msg) => {
			if (!shouldSave) {
				msg.delete({ timeout: 1000 * 60 * 5 });
			}
		});
		let endTime = performance.now();
		console.log(
			` -> Served ${groups.length} group(s); took ${endTime - startTime} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message
			.reply(
				"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
			)
			.then((msg) => {
				msg.delete({ timeout: 1000 * 60 * 5 });
			});
	}
}

async function sendGroupsAsList(message, groups, servername) {
	const serverGroupsEmbed = new MessageEmbed()
		.setColor("#00ff99")
		.setTitle(
			`LFMs on ${servername.charAt(0).toUpperCase() + servername.slice(1)}`
		)
		.setURL(`https://www.playeraudit.com/grouping?s=${servername}`)
		.setAuthor(
			"DDO Audit",
			"https://playeraudit.com/favicon-32x32.png",
			"https://www.playeraudit.com/"
		)
		.setThumbnail("https://playeraudit.com/favicon-32x32.png")
		.setTimestamp()
		.setFooter("Data provided by DDO Audit");

	groups.forEach((g, i) => {
		if (i < 25) {
			serverGroupsEmbed.addFields({
				name: `__${g.Leader.Name}__` || "Anonymous",
				value: `🎚️ Levels ${g.MinimumLevel}-${g.MaximumLevel}${
					g.Quest && g.Quest.Name ? "\n🗺️ " + g.Quest.Name : ""
				}${g.Comment ? '\n💬 "' + g.Comment.trim() + '"' : ""}${
					g.Members.length > 0
						? "\n👥 " + (g.Members.length + 1).toString() + " members"
						: ""
				}${
					g.AdventureActive
						? "\n🕑 Active: " +
						  g.AdventureActive.toString() +
						  " minute" +
						  (g.AdventureActive !== 1 ? "s" : "")
						: ""
				}`,
			});
		}
	});

	return message.channel.send(serverGroupsEmbed);
}

async function postServerStatus(message) {
	let startTime = performance.now();
	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'server status' at '${message.createdAt}'`
	);

	try {
		const { Worlds } = await fetch(
			"https://playeraudit.com/api/serverstatus"
		).then((response) => response.json());

		let onlineservers = [];
		let offlineservers = [];
		let unknownservers = [];

		if (Worlds == null || Worlds.length === 0) {
			offlineservers.push(...SERVERS);
		} else {
			Worlds.forEach((world) => {
				if (world.Status === 1) {
					onlineservers.push(world.Name);
				} else if (world.Status === 0) {
					offlineservers.push(world.Name);
				} else {
					unknownservers.push(world.Name);
				}
			});
		}

		const serverStatusEmbed = new MessageEmbed()
			.setColor("#00ff99")
			.setTitle("Server Status")
			.setURL("https://www.playeraudit.com/servers")
			.setAuthor(
				"DDO Audit",
				"https://playeraudit.com/favicon-32x32.png",
				"https://www.playeraudit.com/"
			)
			.setThumbnail("https://playeraudit.com/favicon-32x32.png")
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		if (onlineservers.length) {
			serverStatusEmbed.addFields({
				name: "✅ ONLINE",
				value: onlineservers.join(", ") || "-",
				inline: false,
			});
		}

		if (offlineservers.length) {
			serverStatusEmbed.addFields({
				name: "❌ OFFLINE",
				value: offlineservers.join(", ") || "-",
				inline: false,
			});
		}

		if (unknownservers.length) {
			serverStatusEmbed.addFields({
				name: "❔ UNKNOWN",
				value: unknownservers.join(", ") || "-",
				inline: false,
			});
		}

		message.channel.send(serverStatusEmbed);

		Verbose.followup(message, 0.25);
		let endTime = performance.now();
		console.log(
			` -> Served ${onlineservers.length} online, ${
				offlineservers.length
			} offline, ${unknownservers.length} unknown; took ${
				endTime - startTime
			} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
		);
	}
}

async function postPopulation(message, prefix) {
	let startTime = performance.now();
	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'population' at '${message.createdAt}'`
	);
	try {
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const command = args.shift();
		const server = args.shift();
		let filter = args.join(" ");

		let servername = fixServerName(server);

		if (server != null && servername === "") {
			message.reply(`I don't recognize that server.`);
			return;
		} else if (servername === "") {
			await postGamePopulation(message)
				.then((msg) => {})
				.catch((err) => {
					console.log(` -> FAILED with error \n${error}`);
					message.reply(
						"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
					);
				});
		} else {
			const { Players, Population } = await fetch(
				`https://playeraudit.com/api/players?s=${servername}`
			)
				.then((response) => response.json())
				.catch((err) => {
					console.log(` -> FAILED with error \n${error}`);
					message.reply(
						"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
					);
				});

			const uniquecounts = await fetch(
				`https://playeraudit.com/api/uniquedata`
			)
				.then((response) => response.json())
				.catch((err) => {
					console.log(` -> FAILED with error \n${error}`);
					message.reply(
						"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
					);
				});

			let uniqueplayers = 0;
			let uniqueguilds = 0;
			uniquecounts.forEach((s) => {
				if (s.ServerName.toLowerCase() === servername.toLowerCase()) {
					uniqueplayers = s.UniquePlayers;
					uniqueguilds = s.UniqueGuilds;
				}
			});

			if (filter.trim() === "") {
				let inparty = 0;
				let inquest = 0;
				let inguild = 0;
				let avglevel = 0;

				Players.forEach((player) => {
					if (player.GroupId) inparty++;
					if (!player.Location.IsPublicSpace) inquest++;
					if (player.Guild !== "") inguild++;
					avglevel += player.TotalLevel;
				});
				avglevel /= Population;

				const serverStatusEmbed = new MessageEmbed()
					.setColor("#00ff99")
					.setTitle(
						`${servername.charAt(0).toUpperCase() + servername.slice(1)}`
					)
					.setURL(`https://www.playeraudit.com/servers?s=${servername}`)
					.setAuthor(
						"DDO Audit",
						"https://playeraudit.com/favicon-32x32.png",
						"https://www.playeraudit.com/"
					)
					.setDescription(
						`There are currently ${Population} players on ${
							servername.charAt(0).toUpperCase() + servername.slice(1)
						}.`
					)
					.setThumbnail("https://playeraudit.com/favicon-32x32.png")
					.addFields(
						{
							name: "Players in groups",
							value: `${Math.round(
								(inparty / Population) * 100
							)}% (${inparty}/${Population})`,
							inline: false,
						},
						{
							name: "Players in quests",
							value: `${Math.round(
								(inquest / Population) * 100
							)}% (${inquest}/${Population})`,
							inline: false,
						},
						{
							name: "Players in guilds",
							value: `${Math.round(
								(inguild / Population) * 100
							)}% (${inguild}/${Population})`,
							inline: false,
						},
						{
							name: "Average player level",
							value: Math.round(avglevel * 10) / 10,
							inline: false,
						},
						{
							name: "Quarterly players",
							value: `${uniqueplayers} unique players`,
							inline: true,
						},
						{
							name: "Quarterly guilds",
							value: `${uniqueguilds} unique guilds`,
							inline: true,
						}
					)
					.setTimestamp()
					.setFooter("Data provided by DDO Audit");

				await message.channel.send(serverStatusEmbed);
			} else {
				let location = "";
				let matchingplayers = 0;

				Players.forEach((player) => {
					if (
						player != null &&
						player.Location != null &&
						player.Location.Name != null
					) {
						if (location === "") {
							if (
								player.Location.Name.toLowerCase().includes(
									filter.toLowerCase()
								)
							) {
								matchingplayers++;
								location = player.Location.Name;
							}
						} else {
							if (player.Location.Name === location) {
								matchingplayers++;
							}
						}
					}
				});

				const serverStatusEmbed = new MessageEmbed()
					.setColor("#00ff99")
					.setTitle(
						`${servername.charAt(0).toUpperCase() + servername.slice(1)}`
					)
					.setURL(`https://www.playeraudit.com/servers?s=${servername}`)
					.setAuthor(
						"DDO Audit",
						"https://playeraudit.com/favicon-32x32.png",
						"https://www.playeraudit.com/"
					)
					.setDescription(
						`There ${
							matchingplayers === 1 ? "is" : "are"
						} **${matchingplayers}** player${
							matchingplayers === 1 ? "" : "s"
						} on **${
							servername.charAt(0).toUpperCase() + servername.slice(1)
						}** in **'${location || filter}'**.`
					)
					.setThumbnail("https://playeraudit.com/favicon-32x32.png")
					.setTimestamp()
					.setFooter("Data provided by DDO Audit");

				await message.channel.send(serverStatusEmbed);
			}
		}

		Verbose.followup(message, 0.5);
		let endTime = performance.now();
		console.log(
			` -> Served total population; took ${endTime - startTime} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
		);
	}
}

async function postGamePopulation(message) {
	const {
		Argonnessen,
		Cannith,
		Ghallanda,
		Khyber,
		Orien,
		Sarlona,
		Thelanis,
		Wayfinder,
		Hardcore,
	} = await fetch("https://www.playeraudit.com/api/playersoverview").then(
		(response) => response.json()
	);
	const { Worlds } = await fetch(
		"https://playeraudit.com/api/serverstatus"
	).then((response) => response.json());
	let defaultserver = "";
	if (Worlds != null && Worlds.length > 0) {
		Worlds.forEach((world) => {
			if (world.Order === 0) {
				defaultserver = world.Name;
			}
		});
	}

	let totalpopulation =
		Argonnessen +
		Cannith +
		Ghallanda +
		Khyber +
		Orien +
		Sarlona +
		Thelanis +
		Wayfinder +
		Hardcore;

	const serverStatusEmbed = new MessageEmbed()
		.setColor("#00ff99")
		.setTitle("Server Population")
		.setURL("https://www.playeraudit.com/servers")
		.setAuthor(
			"DDO Audit",
			"https://playeraudit.com/favicon-32x32.png",
			"https://www.playeraudit.com/"
		)
		.setDescription(`There are ${totalpopulation} players online:`)
		.setThumbnail("https://playeraudit.com/favicon-32x32.png")
		.addFields(
			{
				name: `${defaultserver === "Argonnessen" ? "⭐" : ""} Argonnessen`,
				value: Argonnessen,
				inline: true,
			},
			{
				name: `${defaultserver === "Cannith" ? "⭐" : ""} Cannith`,
				value: Cannith,
				inline: true,
			},
			{
				name: `${defaultserver === "Ghallanda" ? "⭐" : ""} Ghallanda`,
				value: Ghallanda,
				inline: true,
			},
			{
				name: `${defaultserver === "Khyber" ? "⭐" : ""} Khyber`,
				value: Khyber,
				inline: true,
			},
			{
				name: `${defaultserver === "Orien" ? "⭐" : ""} Orien`,
				value: Orien,
				inline: true,
			},
			{
				name: `${defaultserver === "Sarlona" ? "⭐" : ""} Sarlona`,
				value: Sarlona,
				inline: true,
			},
			{
				name: `${defaultserver === "Thelanis" ? "⭐" : ""} Thelanis`,
				value: Thelanis,
				inline: true,
			},
			{
				name: `${defaultserver === "Wayfinder" ? "⭐" : ""} Wayfinder`,
				value: Wayfinder,
				inline: true,
			},
			{
				name: `${defaultserver === "Hardcore" ? "⭐" : ""} Hardcore`,
				value: Hardcore,
				inline: true,
			}
		)
		.setTimestamp()
		.setFooter("Data provided by DDO Audit");

	let servicemessage = "";
	if (
		!Argonnessen ||
		!Cannith ||
		!Ghallanda ||
		!Khyber ||
		!Orien ||
		!Sarlona ||
		!Thelanis ||
		!Wayfinder
	) {
		// At least 1 server is down
		servicemessage =
			"*Population data takes at least 5 minutes to update after a restart*\n";
	}

	return message.channel.send(
		`${servicemessage}You can check server population trends on <https://www.playeraudit.com>\n⭐ = default server`,
		serverStatusEmbed
	);
}

client.login(token);
