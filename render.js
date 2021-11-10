const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");
const lfmSprites = Canvas.loadImage("./img/lfm-sprite.jpg");

async function sendGroupsAsPanel(message, groups, large) {
	const lfmSprites = await Canvas.loadImage("./img/lfm-sprite.jpg");
	const panelWidth = 848;
	const lfmHeight = 90;
	const classCount = 15;
	let fontModifier = large ? 3 : 0;

	let canvas = Canvas.createCanvas(
		panelWidth,
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
		if (group.Quest != null && group.Quest.Name !== "") {
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
					(textLines.length - 1 + (group.Difficulty.length > 3 ? 1 : 0)) *
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
		if (group.AdventureActive !== 0 && group.AdventureActive !== undefined) {
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
		if (group.AdventureActive !== 0 && group.AdventureActive !== undefined) {
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

	const attachment = new MessageAttachment(canvas.toBuffer(), "ddo-lfm.png");

	return message.channel.send({ files: [attachment] });

	function DrawFiller() {
		for (let i = 0; i < (groups ? Math.max(groups.length, 4) : 4); i++) {
			pen.drawImage(
				lfmSprites,
				0,
				72,
				panelWidth,
				lfmHeight,
				0,
				72 + i * lfmHeight,
				panelWidth,
				lfmHeight
			);
		}
	}

	function OpenPanel() {
		pen.drawImage(lfmSprites, 0, 0, panelWidth, 72, 0, 0, panelWidth, 72);
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
			panelWidth,
			27,
			0,
			72 + Math.max(groups.length, 4) * lfmHeight,
			panelWidth,
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
}

module.exports = { sendGroupsAsPanel };
