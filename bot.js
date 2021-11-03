const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { prefix, token } = require("./config.json");
const Verbose = require("./verbose");
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

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity("Dungeons & Dragons Online");
});

client.on("message", (message) => {
	Verbose.onError(message);
	Verbose.handleUserReply(message);
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	switch (command) {
		case "groups":
		case "lfms":
			if (args.length == 0) {
				message.reply(
					"Which server do you want to check groups for? Example: `!" +
						command +
						" Thelanis`"
				);
				return;
			}
			var serverName = args.shift().toLowerCase();
			postGroups(message, serverName);
			break;
		case "serverpop":
		case "population":
			postPopulation(message);
			break;
		case "serverstatus":
			postServerStatus(message);
			break;
	}
});

function fixServerName(input) {
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

async function postGroups(message, serverName) {
	let startTime = performance.now();
	let servername = fixServerName(serverName);

	let lowerlevel = undefined;
	let upperlevel = undefined;
	let namefilter = "";
	let searchtype = "none";

	let levelregex = /(?<low>\d+)(-(?<high>\d+))?/;
	let nameregex = /(?<name>[\w-]+)/;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();
	const server = args.shift().toLowerCase();
	const filter = args.shift();
	if (filter != null) {
		if (levelregex.test(filter)) {
			searchtype = "level";
			const {
				groups: { low, high },
			} = levelregex.exec(filter);
			if (low != null) lowerlevel = low;
			if (high != null) upperlevel = high;
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
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'groups' for '${servername} ("${serverName}")' at '${message.createdAt}'`
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
			message.channel.send(msg);

			let endTime = performance.now();
			console.log(
				` -> Served message: '${msg}'; took ${endTime - startTime} ms`
			);
			return;
		}

		const serverGroupsEmbed = new MessageEmbed()
			.setColor("#00ff99")
			.setTitle(
				`LFMs on ${
					servername.charAt(0).toUpperCase() + servername.slice(1)
				}`
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

		let alsotrymessage = "";
		let rnd = Math.floor(Math.random() * 10);
		if (rnd === 0) {
			alsotrymessage = `\n(you may also specify a level like \`${message.content} 17\`)`;
		} else if (rnd === 1) {
			alsotrymessage = `\n(you may also specify a level range like \`${message.content} 17-20\`)`;
		} else if (rnd === 2) {
			alsotrymessage = `\n(you may also specify a leader's name like \`${message.content} clemeit\`)`;
		}

		message.channel.send(
			`There ${groups.length == 1 ? "is" : "are"} currently ${
				groups.length
			} group${groups.length == 1 ? "" : "s"} on ${
				servername.charAt(0).toUpperCase() + servername.slice(1)
			}${additionalmessage || alsotrymessage}:`
		);

		message.channel.send(serverGroupsEmbed);

		Verbose.followup(message, 2);
		let endTime = performance.now();
		console.log(
			` -> Served ${groups.length} group(s); took ${endTime - startTime} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
		);
	}
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
			.addFields(
				{
					name: "✅ ONLINE",
					value: onlineservers.join(", ") || "-",
					inline: false,
				},
				{
					name: "❌ OFFLINE",
					value: offlineservers.join(", ") || "-",
					inline: false,
				}
			)
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		if (unknownservers.length) {
			serverStatusEmbed.addFields({
				name: "❔ UNKNOWN",
				value: unknownservers.join(", ") || "-",
				inline: false,
			});
		}

		message.channel.send(serverStatusEmbed);

		Verbose.followup(message, 0.5);
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

async function postPopulation(message) {
	let startTime = performance.now();
	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'population' at '${message.createdAt}'`
	);
	try {
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
					name: `${
						defaultserver === "Argonnessen" ? "⭐" : ""
					} Argonnessen`,
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

		message.channel.send(
			`${servicemessage}You can check server population trends on <https://www.playeraudit.com>`
		);

		message.channel.send(serverStatusEmbed);

		message.channel.send("⭐ = default");

		Verbose.followup(message, 0.25);
		let endTime = performance.now();
		console.log(
			` -> Served ${totalpopulation} total population; took ${
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

client.login(token);
