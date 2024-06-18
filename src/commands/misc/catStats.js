const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addElement, sendEmbedPaged } = require('../../utils/pages');
const posFormat = require('../../utils/calcNumberFormat');
const Cat = require('../../models/Cat');
const Preferences = require('../../models/Preferences');
const statsArray = require('../../objects/catStatsArray');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat')
		.setDescription('Cat stats related commands')
		.addSubcommandGroup((stats) =>
			stats
				.setName('stats')
				.setDescription('Shows the cat stats')
				.addSubcommand((server) =>
					server
						.setName('server')
						.setDescription('Gets the cat stats of the server'),
				)
				.addSubcommand((member) =>
					member
						.setName('member')
						.setDescription(
							'Gets the cat stats for a specific member in the server',
						)
						.addUserOption((user) =>
							user.setName('user').setDescription('The user to select'),
						),
				)
				.addSubcommand((leaderboard) =>
					leaderboard
						.setName('leaderboard')
						.setDescription('Gets the cat stats leaderboards')
						.addStringOption((leaderboard_stat) =>
							leaderboard_stat
								.setName('stat')
								.setDescription(
									'The leaderboard for a specific cat stat option',
								)
								.addChoices(
									statsArray.map((stat) => {
										return {
											name: stat,
											value: stat,
										};
									}),
								),
						),
				),
		)
		.setDMPermission(false),

	run: async ({ interaction }) => {
		await interaction.deferReply();

		const subcommand = interaction.options.getSubcommand();
		const userId =
			interaction.options?.getUser('user')?.id || interaction.member.id;
		const stat = interaction.options?.getString('stat');

		const catStatFields = {};

		const preferences = await Preferences.findOne({
			guildId: interaction.guild.id,
		});

		if (!preferences.cat.enabled) {
			return interaction.editReply('Cat stats are turned off.');
		}

		const catStats = await Cat.findOne({
			userId,
			guildId: interaction.guild.id,
		});

		let allCatCounter;

		// if allow removed members to be counted
		if (preferences.cat.allowRemovedMembers) {
			allCatCounter = await Cat.find({
				guildId: interaction.guild.id,
			}).select('-_id userId stats');
		} else {
			allCatCounter = await Cat.find({
				guildId: interaction.guild.id,
				existsInGuild: true,
			}).select('-_id userId stats');
		}

		for (const option of statsArray) {
			const statArray = allCatCounter.filter(
				(entry) => entry.stats[option] !== 0,
			);
			statArray.sort((a, b) =>
				a.stats[option] === b.stats[option]
					? b.userId - a.userId
					: b.stats[option] - a.stats[option],
			);

			if (statArray.length > 0) {
				catStatFields[option] = statArray.map((entry, index) => ({
					name: `\n`,
					value: `${posFormat.calcNumberFormat(index + 1).result} place: <@${
						entry.userId
					}> with ${entry.stats[option]} ${option}`,
				}));
			} else {
				catStatFields[option] = [
					{
						name: `There are currently no ${option} in this server`,
						value: `\n`,
					},
				];
			}
		}

		const totalMemberCatStats = statsArray.reduce((total, option) => {
			if (catStats && catStats.stats && catStats.stats[option]) {
				return total + catStats.stats[option];
			} else {
				return total;
			}
		}, 0);

		const serverCatStatsEmbed = new EmbedBuilder();

		if (preferences.cat.scanning) {
			serverCatStatsEmbed.setDescription(
				'A scan is currently in progress, stats may not be up to date.',
			);
		}

		const totalServerCatStats = statsArray.reduce((total, option) => {
			const optionTotal = allCatCounter.reduce(
				(optionTotal, entry) => optionTotal + (entry.stats[option] || 0),
				0,
			);
			serverCatStatsEmbed.addFields({
				name: `Total ${option}: ${optionTotal}\n`,
				value: `\n`,
			});
			return total + optionTotal;
		}, 0);

		if (subcommand === 'server') {
			if (totalServerCatStats === 0) {
				interaction.editReply(
					`${interaction.guild.name} doesn't have any cat stats yet`,
				);
				return;
			} else {
				const fieldsToAdd = [
					{
						name: '\u200B',
						value: `**Total Cat Stats: ${totalServerCatStats}**`,
					},
					{ name: '\n', value: '\n' },
				];

				serverCatStatsEmbed.data.fields.unshift(...fieldsToAdd);

				serverCatStatsEmbed.setTitle(`${interaction.guild.name}'s Cat Stats`);
				serverCatStatsEmbed.setThumbnail(await interaction.guild.iconURL());
			}

			try {
				interaction.editReply({ embeds: [serverCatStatsEmbed] });
			} catch (error) {
				interaction.editReply(`Error: ${error}`);
			}
		} else if (subcommand === 'member') {
			const member =
				interaction.guild.members.cache.get(userId) ??
				(await interaction.guild.members.fetch(userId));

			if (!catStats || totalMemberCatStats === 0) {
				interaction.editReply(
					`${
						member.nickname || member.user.displayName
					} doesn't have any cat stats`,
				);
				return;
			}

			const fieldsToAdd = [
				{
					name: '\u200B',
					value: `**Total Cat Stats: ${totalMemberCatStats}**`,
				},
				{ name: '\n', value: '\n' },
			];

			const userCatCountEmbed = new EmbedBuilder()
				.setTitle(
					`${member.nickname || member.user.displayName} (${
						member.user.username
					})'s Cat Stats`,
				)
				.setThumbnail(
					(await member.avatarURL()) || (await member.user.avatarURL()),
				)
				.setColor(member.displayColor)
				.setFields(
					statsArray.map((option) => ({
						name: `Total ${option}: ${catStats.stats[option] || 0}`,
						value: '\n',
					})),
				);

			if (preferences.cat.scanning) {
				userCatCountEmbed.setDescription(
					'A scan is currently in progress, stats may not be up to date.',
				);
			}

			userCatCountEmbed.data.fields.unshift(...fieldsToAdd);

			interaction.editReply({ embeds: [userCatCountEmbed] });
		} else if (subcommand === 'leaderboard') {
			if (totalServerCatStats === 0) {
				interaction.editReply('This server currently has no cat stats');
				return;
			}

			let temporaryFields = [];
			const defaultFields = [];

			if (!stat) {
				for (const option of statsArray) {
					const mostField = catStatFields[option] || [];

					if (mostField.length > 0) {
						const top3MostField = mostField.slice(0, 3); // Limit to the top 3 entries

						temporaryFields.push({
							name: `\u200B`,
							value: `**${option} top three:**\n`,
						});
						temporaryFields.push(...top3MostField);

						defaultFields.push(temporaryFields);
						temporaryFields = [];
					}
				}
			}

			let fields = [];

			if (stat) {
				const statFields = addElement(catStatFields[stat], 10);

				statFields.forEach((field) => {
					fields.push(field.flat());
				});
			} else {
				const leaderboardFields = addElement(defaultFields, 3);

				leaderboardFields.forEach((field) => {
					fields.push(field.flat());
				});
			}

			const leaderboardStatsName =
				stat && stat !== 'uwu' && stat !== 'owo'
					? stat[0]?.toUpperCase() + stat.slice(1)
					: stat === 'uwu'
					? stat.toLowerCase()
					: 'Cat';

			const leaderboardStatsEmbed = new EmbedBuilder().setTitle(
				`${leaderboardStatsName} Stats Leaderboards`,
			);

			if (preferences.cat.scanning) {
				leaderboardStatsEmbed.setDescription(
					'A scan is currently in progress, stats may not be up to date.',
				);
			}

			await sendEmbedPaged(interaction, leaderboardStatsEmbed, fields);
		}
	},
};
