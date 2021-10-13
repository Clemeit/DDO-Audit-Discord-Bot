const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { prefix, token } = require("./config.json");
const client = new Discord.Client();
const fetch = require("node-fetch");

var API = require("node-rest-client").Client;

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
					"Which server do you want to check groups? Example: !" +
						command +
						" Thelanis"
				);
				return;
			}
			var serverName = args.shift().toLowerCase();
			serverName = fixServerName(serverName);
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

// TODO: this just returns ""
function fixServerName(input) {
	switch (input.toLowerCase()) {
		case "a":
		case "argo":
		case "argonesen":
		case "argonnesen":
		case "argonessen":
			return "argonnessen";
		case "c":
		case "canith":
			return "cannith";
		case "g":
		case "ghalanda":
			return "ghallanda";
		case "k":
			return "khyber";
		case "o":
			return "orien";
		case "s":
			return "sarlona";
		case "t":
			return "thelanis";
		case "w":
			return "wayfinder";
		case "h":
		case "hcl":
			return "hardcore";
	}
	return input;
}

async function postGroups(message, serverName) {
	var groups = [];
	var found = false;

	try {
		const { Groups } = await fetch(
			`https://www.playeraudit.com/api/groups?s=${serverName}`
		).then((response) => response.json());
		Groups.forEach(function (group) {
			if (group.Quest == null) group.Quest = { Name: "" };
			groups.push(group);
		});
		if (groups.length == 0) {
			message.channel.send(
				"There are current no groups on " +
					serverName.charAt(0).toUpperCase() +
					serverName.slice(1) +
					"."
			);
			return;
		}
		var nameLength = 0;
		var questLength = 0;
		var commentLength = 8;
		var maxCommentLength = 30;
		groups.forEach(function (group) {
			if (group.Leader.Name.length > nameLength)
				nameLength = group.Leader.Name.length;
			if (group.Quest.Name.length > questLength)
				questLength = group.Quest.Name.length;
			if (group.Comment.length > commentLength)
				commentLength = group.Comment.length;
		});
		if (commentLength > maxCommentLength) commentLength = maxCommentLength;
		message.channel.send(
			`There ${groups.length == 1 ? "is" : "are"} currently ${
				groups.length
			} group${groups.length == 1 ? "" : "s"} on ${
				serverName.charAt(0).toUpperCase() + serverName.slice(1)
			}:`
		);

		const serverStatusEmbed = new MessageEmbed()
			.setColor("#00ff99")
			.setTitle(
				`LFMs on ${
					serverName.charAt(0).toUpperCase() + serverName.slice(1)
				}`
			)
			.setURL("https://www.playeraudit.com/grouping")
			.setAuthor(
				"DDO Audit",
				"https://playeraudit.com/favicon-32x32.png",
				"https://www.playeraudit.com/"
			)
			.setThumbnail("https://playeraudit.com/favicon-32x32.png")
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		groups.forEach((g) => {
			serverStatusEmbed.addFields({
				name: g.Leader.Name || " ",
				value: `${g.Quest.Name ? "\n*" + g.Quest.Name + "*\n" : ""}${
					g.Comment ? '"' + g.Comment + '"' : "No comment"
				}`,
			});
		});

		message.channel.send(serverStatusEmbed);
	} catch (error) {
		message.reply(
			"Having trouble looking that up right now. Please try again later."
		);
	}
}

async function postServerStatus(message) {
	try {
		const { Worlds } = await fetch(
			"https://playeraudit.com/api/serverstatus"
		).then((response) => response.json());

		let onlinestring = "";
		let offlinestring = "";
		let unknownstring = "";

		Worlds.forEach((world) => {
			if (world.Status === 1) {
				onlinestring += world.Name + ", ";
			} else if (world.Status === 0) {
				offlinestring += world.Name + ", ";
			} else {
				unknownstring += world.Name + ", ";
			}
		});

		if (onlinestring) {
			onlinestring = onlinestring.substring(0, onlinestring.length - 2);
		} else {
			onlinestring = "~";
		}

		if (offlinestring) {
			offlinestring = offlinestring.substring(0, offlinestring.length - 2);
		} else {
			offlinestring = "~";
		}

		if (unknownstring) {
			unknownstring = unknownstring.substring(0, unknownstring.length - 2);
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
					name: "ONLINE",
					value: onlinestring,
					inline: false,
				},
				{ name: "OFFLINE", value: offlinestring, inline: false }
			)
			.setTimestamp()
			.setFooter("Data provided by DDO Audit");

		if (unknownstring) {
			serverStatusEmbed.addFields({
				name: "UNKNOWN",
				value: unknownstring,
				inline: false,
			});
		}

		message.channel.send(serverStatusEmbed);
	} catch (error) {
		message.reply(
			"Having trouble looking that up right now. Please try again later."
		);
	}
}

async function postPopulation(message) {
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
		} = await fetch("https://www.playeraudit.com/api/population").then(
			(response) => response.json()
		);

		const serverStatusEmbed = new MessageEmbed()
			.setColor("#00ff99")
			.setTitle("Server Population")
			.setURL("https://www.playeraudit.com/servers")
			.setAuthor(
				"DDO Audit",
				"https://playeraudit.com/favicon-32x32.png",
				"https://www.playeraudit.com/"
			)
			.setDescription("Current server populations")
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

		message.channel.send(serverStatusEmbed);
	} catch (error) {
		message.reply(
			"Having trouble looking that up right now :( Try again later."
		);
	}
}

client.login(token);
