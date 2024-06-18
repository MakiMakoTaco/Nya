const { EmbedBuilder } = require('discord.js');
const catStatsArray = require('../src/objects/catStatsArray');

module.exports = async (guild, client) => {
	try {
		await client.application.fetch();

		const owner = client.application.owner;

		const infoEmbed = new EmbedBuilder()
			.setAuthor({
				name: client.user.username,
				iconURL: client.user.displayAvatarURL(),
			})
			.setTitle(`Bot to track the cat stats in the server.`)
			.setDescription(
				`Cat stats are not enabled by default but you can enable them by running \`/manage-cat status enable <scan>\``,
			)
			.setThumbnail(guild.iconURL())
			.setFields(
				// Enabling cat stats and what stats are available
				{ name: 'Bot owner:', value: `${owner}` },
			)
			.setFooter({
				text: `${owner.username} | ${owner.id}`,
				iconURL: owner.displayAvatarURL(),
			})
			.setTimestamp();

		guild.systemChannel.send({ embeds: [infoEmbed] });
	} catch (error) {
		console.log(
			`There was an error with the introduction of the bot in ${guild.name}: ${guild.id}`,
		);
	}
};
