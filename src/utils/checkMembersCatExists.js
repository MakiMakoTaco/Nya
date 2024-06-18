const Cat = require('../models/Cat');

let uniqueMembers = new Set();

module.exports.checkMembersCatExists = async function (client) {
	const guilds = client.guilds.cache;

	for (const guild of guilds.values()) {
		const memberIds = [];

		const guildManager = client.guilds.cache.get(guild.id);
		const members = await guildManager.members.fetch();

		members.forEach((member) => {
			if (!member.user.bot) {
				memberIds.push(member.id);

				uniqueMembers.add(member.id);
			}
		});

		for (const memberId of memberIds) {
			const cat = await Cat.findOne({ guildId: guild.id, userId: memberId });

			if (cat) {
				if (!cat.existsInGuild) {
					cat.existsInGuild = true;
					await cat.save();
				}
			} else {
				new Cat({
					guildId: guild.id,
					userId: memberId,
					existsInGuild: true,
					stats: {},
				}).save();
			}
		}

		const catsToUpdate = await Cat.find({
			guildId: guild.id,
			userId: { $nin: memberIds },
		});
		for (const cat of catsToUpdate) {
			if (cat.existsInGuild) {
				cat.existsInGuild = false;
				await cat.save();
			}
		}
	}
};

module.exports.uniqueMembers = uniqueMembers;
