const { ActivityType } = require('discord.js');
const {
	checkMembersCatExists,
	uniqueMembers,
} = require('./02checkMembersCatExists');

module.exports = async (client) => {
	await checkMembersCatExists(client);

	const guilds = client.guilds.cache;

	await client.user.setActivity(
		`${uniqueMembers.size} kitt${uniqueMembers.size === 1 ? 'y' : 'ies'} in ${
			guilds.size
		} server${guilds.size === 1 ? '' : 's'}`,
		{ type: ActivityType.Watching },
	);
};
