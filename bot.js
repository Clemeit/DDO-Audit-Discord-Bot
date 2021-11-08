const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { prefix, token } = require("./config.json");
const Verbose = require("./verbose");
const Render = require("./render");
const client = new Discord.Client();
const fetch = require("node-fetch");
const { performance } = require("perf_hooks");

const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");
const lfmSprites = Canvas.loadImage("./img/lfm-sprite.jpg");

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
		case "view":
			if (args.length == 0) {
				message.reply(
					"For which server do you want to view the LFM panel? Example: `!" +
						command +
						" Thelanis`"
				);
				return;
			}
			var serverName = args.shift().toLowerCase();
			postLfmPanel(message, serverName);
			break;
	}
});

async function postLfmPanel(message, serverName) {
	let startTime = performance.now();
	let servername = fixServerName(serverName);

	if (servername === "") {
		message.reply(`I don't recognize that server.`);
		return;
	}

	console.log(
		`'${message.guild} @ ${message.channel.name}': '${message.author.username}' requested 'LFM panel' for '${servername} ("${serverName}")' at '${message.createdAt}'`
	);

	try {
		const lfmSprites = await Canvas.loadImage("./img/lfm-sprite.jpg");
		const panelWidth = 848;
		const lfmHeight = 90;
		const classCount = 15;
		let fontModifier = 0;
		let groups = [];
		const { Groups } = await fetch(
			`https://www.playeraudit.com/api/groups?s=${servername}`
		).then((response) => response.json());
		Groups.forEach((g) => groups.push(g));
		groups.reverse();

		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const command = args.shift().toLowerCase();
		const server = args.shift().toLowerCase();
		const mods = args.shift();

		if (mods === "large") {
			fontModifier = 3;
		}

		let canvas = Canvas.createCanvas(
			848,
			Math.max(groups.length, 4) * 90 + 99
		);
		let pen = canvas.getContext("2d");

		// Open
		OpenPanel();

		// Close
		ClosePanel();

		// Draw lfms
		DrawFiller();
		groups.forEach((group, index) => {
			let gradient = pen.createLinearGradient(
				0,
				72 + index * lfmHeight,
				0,
				72 + (index + 1) * lfmHeight
			);
			gradient.addColorStop(0, "#3b3b25");
			gradient.addColorStop(0.25, "#4c4a31");
			gradient.addColorStop(0.75, "#4c4a31");
			gradient.addColorStop(1, "#3b3b25");

			pen.fillStyle = gradient;
			pen.fillRect(26, 73 + lfmHeight * index, 802, lfmHeight);

			pen.beginPath();
			pen.strokeStyle = "#8f8d74";
			pen.lineWidth = 1;
			pen.rect(26, 73 + lfmHeight * index, 802, lfmHeight);
			pen.stroke();

			pen.moveTo(375, 73 + lfmHeight * index);
			pen.lineTo(375, 73 + lfmHeight * index + lfmHeight);
			pen.stroke();

			pen.moveTo(605, 73 + lfmHeight * index);
			pen.lineTo(605, 73 + lfmHeight * index + lfmHeight);
			pen.stroke();

			pen.moveTo(742, 73 + lfmHeight * index);
			pen.lineTo(742, 73 + lfmHeight * index + lfmHeight);
			pen.stroke();

			// Draw party leader's name
			pen.fillStyle = "#f6f1d3";
			pen.textBaseline = "alphabetic";
			pen.font = `${18 + fontModifier}px 'Trebuchet MS'`;
			pen.textAlign = "left";
			pen.fillText(
				group.Leader.Name,
				49,
				73 + lfmHeight * index + 18 + fontModifier / 2
			);
			var leaderWidth = pen.measureText(group.Leader.Name).width;
			if (group.Leader.Name.startsWith("Clemei")) {
				leaderWidth += 22;
				pen.drawImage(
					lfmSprites,
					728,
					189,
					18,
					18,
					49 + leaderWidth - 20,
					58 + lfmHeight * index + 18,
					18,
					18
				);
			}

			// Draw party leader's level
			pen.textAlign = "center";
			pen.font = `${15 + fontModifier}px Arial`;
			pen.fillText(
				group.Leader.TotalLevel ||
					(group.Leader.Name === "DDO Audit" ? "99" : "0"),
				360,
				90 + lfmHeight * index + fontModifier / 2
			);

			// Draw level range
			pen.textBaseline = "middle";
			pen.font = `${16 + fontModifier}px Arial`;
			pen.fillText(
				(group.MinimumLevel || "1") + " - " + (group.MaximumLevel || "30"),
				786,
				117 + lfmHeight * index
			);
			pen.textBaseline = "alphabetic";

			// Draw member count
			if (group.Members) {
				if (group.Members.length > 0) {
					pen.fillStyle = "#b6b193";
					pen.textAlign = "left";
					pen.fillText(
						"(" + (group.Members.length + 1) + " members)",
						49 + leaderWidth + 4,
						73 + lfmHeight * index + 18 + fontModifier / 2
					);
				}
			}

			// Draw quest
			if (group.Quest != null) {
				pen.fillStyle = "#f6f1d3";
				pen.font = `${18 + fontModifier}px Arial`;
				pen.textAlign = "center";
				let textLines = wrapText(group.Quest.Name, 220);
				if (textLines.length > 2 && fontModifier > 0) {
					textLines = textLines.slice(0, 2);
					textLines[1] = textLines[1] + "...";
				}
				for (let i = 0; i < textLines.length; i++) {
					pen.fillText(
						textLines[i],
						489,
						120 +
							lfmHeight * index -
							(textLines.length -
								1 +
								(group.Difficulty.length > 3 ? 1 : 0)) *
								9 +
							i * (19 + fontModifier)
					);
				}
				pen.fillStyle = "#b6b193";
				pen.font = `${14 + fontModifier}px Arial`;
				pen.fillText(
					"(" + group.Difficulty + ")",
					489,
					123 +
						lfmHeight * index -
						(textLines.length -
							1 +
							(group.Difficulty.length > 3 ? 1 : 0)) *
							9 +
						textLines.length * (19 + fontModifier)
				);
			}

			// Draw race icon
			let raceIconBounds = getRaceIconPosition(
				group.Leader.Gender + " " + group.Leader.Race
			);
			pen.drawImage(
				lfmSprites,
				raceIconBounds[0],
				raceIconBounds[1],
				18,
				18,
				28,
				73 + lfmHeight * index + 3,
				18,
				18
			);

			// Draw class array
			if (!group.hasOwnProperty("AcceptedCount")) {
				pen.drawImage(
					lfmSprites,
					287,
					189,
					102,
					60,
					608,
					77 + index * lfmHeight,
					102,
					60
				);
			} else {
				if (group.AcceptedCount === classCount) {
					pen.drawImage(
						lfmSprites,
						287,
						189,
						102,
						60,
						608,
						77 + index * lfmHeight,
						102,
						60
					);
				} else {
					group.AcceptedClasses.forEach((playerclass, i) => {
						let classIconPosition = getClassIconPosition(playerclass);
						pen.drawImage(
							lfmSprites,
							classIconPosition[0],
							classIconPosition[1],
							18,
							18,
							608 + (i % 5) * 21,
							77 + index * lfmHeight + Math.floor(i / 5) * 21,
							18,
							18
						);
					});
				}
			}

			// Draw comment
			pen.fillStyle = "#bfbfbf";
			pen.font = `${15 + fontModifier}px Arial`;
			pen.textAlign = "left";
			let textLines = wrapText(group.Comment, 330);
			if (
				group.AdventureActive !== 0 &&
				group.AdventureActive !== undefined
			) {
				if (
					textLines.length > 2 ||
					(textLines.length > 1 && fontModifier > 0)
				) {
					textLines = textLines.slice(0, 1);
					textLines[textLines.length - 1] =
						textLines[textLines.length - 1] + "...";
				}
			} else {
				if (textLines.length > 2 && fontModifier > 0) {
					textLines = textLines.slice(0, 2);
					textLines[textLines.length - 1] =
						textLines[textLines.length - 1] + "...";
				} else if (textLines.length > 3) {
					textLines = textLines.slice(0, 2);
					textLines[textLines.length - 1] =
						textLines[textLines.length - 1] + "...";
				}
			}
			for (let i = 0; i < Math.min(textLines.length, 3); i++) {
				pen.fillText(
					textLines[i],
					31,
					110 +
						lfmHeight * index +
						i * (19 + fontModifier) +
						fontModifier * 1.5
				);
			}

			// Draw active time
			if (
				group.AdventureActive !== 0 &&
				group.AdventureActive !== undefined
			) {
				pen.fillStyle = "#02adfb";
				pen.textAlign = "center";
				pen.fillText(
					"Adventure Active: " +
						group.AdventureActive +
						(group.AdventureActive === 1 ? " minute" : " minutes"),
					200,
					148 + lfmHeight * index
				);
			}
		});

		const attachment = new MessageAttachment(
			canvas.toBuffer(),
			"ddo-lfm.png"
		);

		let endTime = performance.now();
		message.channel
			.send({ files: [attachment] })
			.then(() => {
				console.log(
					` -> Served ${groups.length} group(s); took ${
						endTime - startTime
					} ms`
				);
			})
			.catch((err) => {
				if (err.code == 50013) {
					console.log(
						` -> Failed with insufficient permissions; took ${
							endTime - startTime
						} ms`
					);
					message.reply(
						"I don't have permission to send images in this channel."
					);
				}
			});

		function DrawFiller() {
			for (let i = 0; i < (Groups ? Math.max(Groups.length, 4) : 4); i++) {
				pen.drawImage(
					lfmSprites,
					0,
					72,
					848,
					lfmHeight,
					0,
					72 + i * lfmHeight,
					848,
					lfmHeight
				);
			}
		}

		function OpenPanel() {
			pen.drawImage(lfmSprites, 0, 0, 848, 72, 0, 0, 848, 72);
			let lastUpdateTime = new Date();
			let hour = lastUpdateTime.getHours() % 12;
			if (hour == 0) hour = 12;
			let timeText =
				"Last updated " +
				hour +
				":" +
				("0" + lastUpdateTime.getMinutes()).slice(-2) +
				":" +
				("0" + lastUpdateTime.getSeconds()).slice(-2) +
				(Math.floor(lastUpdateTime.getHours() / 12) == 0 ? " AM" : " PM");
			pen.font = "18px Arial";
			pen.textAlign = "center";
			pen.textBaseline = "middle";
			pen.fillStyle = "white";
			pen.fillText(timeText, 212, 19);
			pen.textAlign = "left";
			pen.textBaseline = "alphabetic";
		}

		// Draws the chin
		function ClosePanel() {
			pen.drawImage(
				lfmSprites,
				0,
				162,
				848,
				27,
				0,
				72 + Math.max(Groups.length, 4) * lfmHeight,
				848,
				27
			);
		}

		// Helper function for wrapping text
		function wrapText(text, maxWidth) {
			if (text === null) return "";
			let words = text.split(" ");
			let lines = [];
			let currentLine = words[0];

			for (let i = 1; i < words.length; i++) {
				let word = words[i];
				let width = pen.measureText(currentLine + " " + word).width;
				if (width < maxWidth) {
					currentLine += " " + word;
				} else {
					lines.push(currentLine);
					currentLine = word;
				}
			}
			lines.push(currentLine);
			return lines;
		}

		// Helper function for getting race icon position
		function getRaceIconPosition(race) {
			let xsrc = 0;
			let ysrc = 0;
			switch (race) {
				case "Female Aasimar":
				case "Female Aasimar Scourge":
					xsrc = 0;
					ysrc = 0;
					break;
				case "Female Dragonborn":
					xsrc = 18;
					ysrc = 0;
					break;
				case "Female Drow Elf":
					xsrc = 36;
					ysrc = 0;
					break;
				case "Female Dwarf":
					xsrc = 54;
					ysrc = 0;
					break;
				case "Female Elf":
				case "Female Sun Elf":
				case "Female Wood Elf":
					xsrc = 72;
					ysrc = 0;
					break;
				case "Female Gnome":
				case "Female Deep Gnome":
					xsrc = 0;
					ysrc = 18;
					break;
				case "Female Half Elf":
					xsrc = 18;
					ysrc = 18;
					break;
				case "Female Halfling":
					xsrc = 36;
					ysrc = 18;
					break;
				case "Female Half Orc":
					xsrc = 54;
					ysrc = 18;
					break;
				case "Female Human":
				case "Female Shadar-kai":
				case "Female Purple Dragon Knight":
					xsrc = 72;
					ysrc = 18;
					break;
				case "Female Shifter":
				case "Female Razorclaw Shifter":
					xsrc = 90;
					ysrc = 18;
					break;
				case "Female Tiefling":
				case "Female Tiefling Scoundrel":
					xsrc = 0;
					ysrc = 36;
					break;
				case "Female Warforged":
				case "Female Bladeforged":
					xsrc = 18;
					ysrc = 36;
					break;
				case "Male Aasimar":
				case "Male Aasimar Scourge":
					xsrc = 36;
					ysrc = 36;
					break;
				case "Male Dragonborn":
					xsrc = 54;
					ysrc = 36;
					break;
				case "Male Drow Elf":
					xsrc = 72;
					ysrc = 36;
					break;
				case "Male Dwarf":
					xsrc = 0;
					ysrc = 54;
					break;
				case "Male Elf":
				case "Male Sun Elf":
				case "Male Wood Elf":
					xsrc = 18;
					ysrc = 54;
					break;
				case "Male Gnome":
				case "Male Deep Gnome":
					xsrc = 36;
					ysrc = 54;
					break;
				case "Male Half Elf":
					xsrc = 54;
					ysrc = 54;
					break;
				case "Male Halfling":
					xsrc = 72;
					ysrc = 54;
					break;
				case "Male Half Orc":
					xsrc = 0;
					ysrc = 72;
					break;
				case "Male Human":
				case "Male Shadar-kai":
				case "Male Purple Dragon Knight":
					xsrc = 18;
					ysrc = 72;
					break;
				case "Male Shifter":
				case "Male Razorclaw Shifter":
					xsrc = 90;
					ysrc = 0;
					break;
				case "Male Tiefling":
				case "Male Tiefling Scoundrel":
					xsrc = 36;
					ysrc = 72;
					break;
				case "Male Warforged":
				case "Male Bladeforged":
					xsrc = 54;
					ysrc = 72;
					break;
				default:
					xsrc = 72;
					ysrc = 72;
					break;
			}
			return [xsrc + 493, ysrc + 189];
		}

		// Helper function for getting race icon position
		function getClassIconPosition(classname) {
			let xsrc = 0;
			let ysrc = 0;
			switch (classname) {
				case "Alchemist": // 70032AFE
					xsrc = 21;
					ysrc = 0;
					break;
				case "Artificer": // 700148CE
					xsrc = 42;
					ysrc = 42;
					break;
				case "Barbarian": // 7000006B
					xsrc = 84;
					ysrc = 0;
					break;
				case "Bard": // 7000006C
					xsrc = 0;
					ysrc = 42;
					break;
				case "Cleric": // 7000006D
					xsrc = 42;
					ysrc = 21;
					break;
				case "Druid": // 70016ADB
					xsrc = 63;
					ysrc = 42;
					break;
				case "Favored Soul": // 7000C5CE
					xsrc = 63;
					ysrc = 0;
					break;
				case "Fighter": // 7000006E
					xsrc = 0;
					ysrc = 0;
					break;
				case "Monk": // 70006BF5
					xsrc = 21;
					ysrc = 42;
					break;
				case "Paladin": // 7000006F
					xsrc = 42;
					ysrc = 0;
					break;
				case "Ranger": // 70000070
					xsrc = 21;
					ysrc = 21;
					break;
				case "Rogue": // 70000071
					xsrc = 0;
					ysrc = 21;
					break;
				case "Sorcerer": // 7000000B
					xsrc = 84;
					ysrc = 21;
					break;
				case "Warlock": // 7000C5DA
					xsrc = 84;
					ysrc = 42;
					break;
				case "Wizard": // 7000000E
					xsrc = 63;
					ysrc = 21;
					break;
				case "Epic": // 7001B1A3
					xsrc = 423;
					ysrc = 0;
					break;
			}
			return [xsrc + 287, ysrc + 189];
		}
	} catch (error) {
		console.log(` -> FAILED with error \n${error}`);
		message.reply(
			"We're having trouble looking that up right now. Please try again later.\n\nThis bot is still in development. If you'd like to report an issue, you may reply directly to this message or contact me at Clemeit#7994."
		);
	}
}

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
	let difficultyfilter = "";
	let searchtype = "none";

	let levelregex = /(?<low>\d+)(-(?<high>\d+))?/;
	let nameregex = /(?<name>[\w-]+)/;
	const difficulties = ["casual", "normal", "hard", "elite", "reaper"];

	const args = message.content.slice(prefix.length).trim().split(/ +/);
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
		} else if (rnd === 3) {
			alsotrymessage = `\n(you can view a screenshot of the LFM panel with \`!view servername\`)`;
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
