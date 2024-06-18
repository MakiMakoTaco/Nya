const { ActivityType } = require('discord.js');

module.exports = async (member, client) => {
	const guilds = client.guilds.cache;

	const uniqueMembers = new Set();

	for (const guild of guilds.values()) {
		const guildManager = client.guilds.cache.get(guild.id);
		const members = await guildManager.members.fetch();

		members.forEach((member) => {
			if (!member.user.bot) {
				uniqueMembers.add(member.id);
			}
		});
	}

	await client.user.setActivity(
		`${uniqueMembers.size} kitt${uniqueMembers.size === 1 ? 'y' : 'ies'} in ${
			guilds.size
		} server${guilds.size === 1 ? '' : 's'}`,
		{ type: ActivityType.Watching },
	);
};
