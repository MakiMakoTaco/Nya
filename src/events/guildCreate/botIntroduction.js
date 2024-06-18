// const { EmbedBuilder } = require('discord.js');

// module.exports = async (guild, client) => {
// 	try {
// 		await client.application.fetch();

// 		const owner = client.application.owner;

// 		const infoEmbed = new EmbedBuilder()
// 			.setAuthor({
// 				name: client.user.username,
// 				iconURL: client.user.displayAvatarURL(),
// 			})
// 			.setTitle(`General purpose bot with cat stats.`)
// 			.setDescription(
// 				`Cat stats are not enabled by default but you can enable them by running \`/manage-cat status enable <scan>\`
// 				\n\nLogging is also disabled by default, if you wish to enable it then please run \`/logs config status <active>\`
// 				\n\nPlease contact the bot owner for any bugs, feedback or suggestions by either contacting directly or using the \`/contact\` command.\n`,
// 			)
// 			.setThumbnail(guild.iconURL())
// 			.setFields(
// 				{
// 					name: 'Already planned features:',
// 					value: `• Collectibles, daily rewards and minigames (suggestions of what are welcome)
//           \n• Sleep command
//           \n• Reminder command
//           \n• Role and channel logs
//           \n• Top contributor to cat stats
//           \n• Improve YouTube options and one for Twitch
//           \n• Option to ignore specific cat stats and not include in leaderboards`,
// 				},
// 				{ name: 'Bot owner:', value: `${owner}` },
// 			)
// 			.setFooter({
// 				text: `${owner.username} | ${owner.id}`,
// 				iconURL: owner.displayAvatarURL(),
// 			})
// 			.setTimestamp();

// 		guild.systemChannel.send({ embeds: [infoEmbed] });
// 	} catch (error) {
// 		console.log(
// 			`There was an error with the introduction of the bot in ${guild.name}: ${guild.id}`,
// 		);
// 	}
// };
