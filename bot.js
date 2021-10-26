const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { prefix, token } = require("./config.json");
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

	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'groups' for '${servername} ("${serverName}")' at '${message.createdAt}'`
	);

	if (servername === "") {
		message.reply(`I don't recognize that server.`);
		return;
	}

	var groups = [];

	try {
		const { Groups } = await fetch(
			`https://www.playeraudit.com/api/groups?s=${servername}`
		).then((response) => response.json());
		Groups.forEach(function (group) {
			if (group.Quest == null) group.Quest = { Name: "" };
			if (group.Leader.Name !== "DDO Audit") groups.push(group);
		});

		if (groups.length == 0) {
			message.channel.send(
				"There are currently no groups on " +
					servername.charAt(0).toUpperCase() +
					servername.slice(1) +
					"."
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
					name: g.Leader.Name || " ",
					value: `${g.Quest.Name ? "\n ~ " + g.Quest.Name + "\n" : ""}${
						g.Comment ? '*"' + g.Comment.trim() + '"*' : "No comment"
					}`,
				});
			}
		});

		message.channel.send(
			`There ${groups.length == 1 ? "is" : "are"} currently ${
				groups.length
			} group${groups.length == 1 ? "" : "s"} on ${
				servername.charAt(0).toUpperCase() + servername.slice(1)
			}:`
		);

		message.channel.send(serverGroupsEmbed);

		let endTime = performance.now();
		console.log(
			` -> Served ${groups.length} group(s); took ${endTime - startTime} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later."
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
					value: onlineservers.join(", "),
					inline: false,
				},
				{
					name: "❌ OFFLINE",
					value: offlineservers.join(", "),
					inline: false,
				}
			)
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		if (unknownservers.length) {
			serverStatusEmbed.addFields({
				name: "❔ UNKNOWN",
				value: unknownservers.join(", "),
				inline: false,
			});
		}

		message.channel.send(serverStatusEmbed);

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
			"We're having trouble looking that up right now. Please try again later."
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
				{ name: "Argonnessen", value: Argonnessen, inline: true },
				{ name: "Cannith", value: Cannith, inline: true },
				{ name: "Ghallanda", value: Ghallanda, inline: true },
				{ name: "Khyber", value: Khyber, inline: true },
				{ name: "Orien", value: Orien, inline: true },
				{ name: "Sarlona", value: Sarlona, inline: true },
				{ name: "Thelanis", value: Thelanis, inline: true },
				{ name: "Wayfinder", value: Wayfinder, inline: true },
				{ name: "Hardcore", value: Hardcore, inline: true }
			)
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		message.channel.send(
			`You can check server population trends on <https://www.playeraudit.com>`
		);

		message.channel.send(serverStatusEmbed);

		let endTime = performance.now();
		console.log(
			` -> Served ${totalpopulation} total population; took ${
				endTime - startTime
			} ms`
		);
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later."
		);
	}
}

client.login(token);
