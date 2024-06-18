const Preferences = require('../../models/Preferences');

module.exports = async (client) => {
	let modelsExist = true;
	const noModelGuilds = [];
	const guilds = client.guilds.cache;

	let allGuilds = [];
	guilds.forEach(async (guild) => {
		allGuilds.push(guild);
	});

	console.log('Checking preferences for all guilds...');

	for (let i = 0; i < allGuilds.length; i++) {
		const query = { guildId: allGuilds[i].id };
		const guildPreferences = await Preferences.findOne(query);

		if (guildPreferences) {
			if (guildPreferences.cat.scanning === true) {
				guildPreferences.cat.scanning = false;

				const guild = client.guilds.cache.get(allGuilds[i].id);
				const owner = await guild.fetchOwner();

				await guildPreferences
					.save()
					.then(async () => {
						await owner.send(
							`The bot was restarted whilst a cat scan was happening in ${allGuilds[i].name} (${allGuilds[i].id}). Please start a new one if you wish to rescan.`,
						);
						console.log(`Cat scan reset for ${guild.name} (${guild.id})`);
					})
					.catch((e) =>
						console.error(
							`There was an error alerting the owner of the server ${allGuilds[i].id}: `,
							e,
						),
					);
			}
		} else {
			new Preferences(query)
				.save()
				.then((model) => {
					console.log(
						`A new preferences model has been created for ${allGuilds[i].name}: ${model}`,
					);

					modelsExist = false;
					noModelGuilds.push(allGuilds[i].id);
				})
				.catch((e) => {
					console.error(
						`There was an error creating a preferences model for ${allGuilds[i].name}: `,
						e,
					);
				});
		}
	}

	if (modelsExist) {
		console.log('Preference models already exist for all guilds.');
	} else {
		console.log(`Preference models created for ${noModelGuilds.join(', ')}`);
	}
};
