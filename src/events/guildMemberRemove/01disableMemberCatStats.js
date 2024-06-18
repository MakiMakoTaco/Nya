const Cat = require('../../models/Cat');

module.exports = async (member) => {
	await Cat.updateOne(
		{ guildId: member.guild.id, userId: member.id },
		{ existsInGuild: false },
	);
};
