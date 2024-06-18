const Preferences = require('../../models/Preferences');
const Cat = require('../../models/Cat');
const statsArray = require('../../objects/catStatsArray');

module.exports = async (message) => {
	const preferencesModel = await Preferences.findOne({
		guildId: message.guild.id,
	});

	if (!message.guild || message.author.bot || !preferencesModel?.cat.enabled) {
		return;
	}

	const catContent = message.content
		.toLowerCase()
		.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
		.replace(/<:.+?:\d+>/g, '')
		.replace(/(.)\1{1,}/g, '$1'); // Perform character condensing

	const query = {
		userId: message.author.id,
		guildId: message.guild.id,
	};

	try {
		let catCounter = await Cat.findOne(query);

		if (!catCounter) {
			catCounter = new Cat({
				...query,
				stats: {}, // Initialize the 'stats' field
			});
		}

		if (catCounter.existsInGuild === false) {
			catCounter.existsInGuild = true;
		}

		const catStats = {};

		statsArray.forEach((stat) => {
			const phrase = stat.replace(/(.)\1{1,}/g, '$1'); // Default key is the phrase itself

			let regexPattern;
			if (stat === ':3') {
				regexPattern = new RegExp(`(?<=\\s|^)${phrase}(?=\\s|$)`, 'ig');
			} else {
				regexPattern = new RegExp(`\\b${phrase}\\b`, 'ig');
			}

			const matches = catContent.match(regexPattern) || [];

			catStats[stat] = matches.length > 0;
		});

		// Check if at least one stat has a non-zero value
		const hasStat = Object.values(catStats).some((value) => value !== 0);

		if (hasStat) {
			Object.keys(catStats).forEach((stat) => {
				catCounter.stats[stat] += +catStats[stat];
			});

			try {
				await catCounter.save();
			} catch (error) {
				console.error(`There was an error ${error}`);
			}
		}
	} catch (error) {
		console.error(`There was an error ${error}`);
	}
};
