const Preferences = require('../../models/Preferences');

module.exports = async (guild) => {
	const existingPreferences = await Preferences.findOne({ guildId: guild.id });

	if (!existingPreferences) {
		try {
			await Preferences.create({
				guildId: guild.id,
			}).catch((error) => {
				console.error(
					`There was an error when creating the preferences for a guild: `,
					error,
				);
			});
		} catch (error) {
			console.error(
				`There was an error when joining a guild with setting the preferences: `,
				error,
			);
		}
	}
};
