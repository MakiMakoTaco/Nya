const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ComponentType,
} = require('discord.js');
const Preferences = require('../../models/Preferences');
const Cat = require('../../models/Cat');
const { processChannelsInChunks } = require('../../utils/catScan');
// const { eventEmitter } = require('../../mrrp');
// const statsArray = require('../../database/schemas/objects/catStatsArray');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('manage-cat')
		.setDescription('Manages the details of Cat Stats')
		.addSubcommandGroup((status) =>
			status
				.setName('status')
				.setDescription('Sets cat stats in this server')
				.addSubcommand((enable) =>
					enable
						.setName('enable')
						.setDescription('Enables cat stats in this server')
						.addBooleanOption((scan) =>
							scan
								.setName('scan')
								.setDescription(
									'Scans all messages in the server and creates/updates cat stats for each member',
								),
						),
				)
				.addSubcommand((disable) =>
					disable
						.setName('disable')
						.setDescription('Disables cat stats for this server')
						.addBooleanOption((reset) =>
							reset.setName('reset').setDescription('Resets all cat stats'),
						),
				),
		)
		.addSubcommand(
			(scan) =>
				scan
					.setName('scan')
					.setDescription(
						'Scans all messages in the server and creates/updates cat stats for each member',
					),
			// .addSubcommand((start) =>
			// 	start
			// 		.setName('start')
			// 		.setDescription('Starts a cat scan for this server'),
			// )
			// .addSubcommand((stop) =>
			// 	stop
			// 		.setName('stop')
			// 		.setDescription('Stops an ongoing cat scan for this server'),
			// ),
		)
		.addSubcommandGroup(
			(config) =>
				config
					.setName('config')
					.setDescription('Config settings for controlling how cat stats work')
					.addSubcommand((allowNonMembers) =>
						allowNonMembers
							.setName('removed-users')
							.setDescription(
								'Changes whether users not in the server anymore can be on the leaderboards',
							)
							.addBooleanOption((allow) =>
								allow
									.setName('allow')
									.setDescription(
										'Allow users not in the server to be on the leaderboards',
									)
									.setRequired(true),
							),
					),
			// .addSubcommand((reset) =>
			// 	reset
			// 		.setName('reset')
			// 		.setDescription('Resets the cat stats')
			// 		.addBooleanOption((allUsers) =>
			// 			allUsers
			// 				.setName('all')
			// 				.setDescription(
			// 					'Resets cat stats for all users in this server',
			// 				)
			// 				.setRequired(true),
			// 		)
			// 		.addStringOption((users) =>
			// 			users
			// 				.setName('users')
			// 				.setDescription(
			// 					'The users to reset cat stats for. Input either their username or userID and seperate with a space',
			// 				),
			// 		),
			// )
			// .addSubcommand((slowmode) =>
			// 	slowmode
			// 		.setName('slowmode')
			// 		.setDescription('Set slow mode duration for cat stats')
			// 		.addIntegerOption((duration) =>
			// 			duration
			// 				.setName('duration')
			// 				.setDescription('Duration for the slow mode in seconds')
			// 				.setRequired(true),
			// 		),
			// )
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),

	run: async ({ interaction, client }) => {
		await interaction.deferReply();

		const subcommandGroup = interaction.options?.getSubcommandGroup();
		const subcommand = interaction.options?.getSubcommand();

		const confirmButton = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm')
			.setStyle(ButtonStyle.Success);
		const cancelButton = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder().addComponents(
			confirmButton,
			cancelButton,
		);

		const guildId = interaction.guild.id;

		const guildPreferences = await Preferences.findOne({
			guildId,
		});

		const filter = (i) => i.user.id === interaction.user.id;

		if (guildPreferences.cat.scanning === true) {
			// if (subcommandGroup === 'scan' && subcommand === 'stop') {
			// 	const reply = await interaction.editReply({
			// 		content:
			// 			'Are you sure you want to interrupt the ongoing cat scan? This will keep all current stats.',
			// 		components: [row],
			// 	});

			// 	const userResponse = await reply.createMessageComponentCollector({
			// 		ComponentType: ComponentType.Button,
			// 		filter,
			// 		time: 60_000,
			// 		max: 1,
			// 	});

			// 	userResponse.on('end', async (i) => {
			// 		const response = i.values().next().value;

			// 		if (response?.customId === 'confirm') {
			// 			eventEmitter.emit('stopScan');

			// 			return interaction.editReply({
			// 				content: 'Scan cancelled.',
			// 				components: [],
			// 			});
			// 		} else {
			// 			return interaction.editReply({
			// 				content: 'Scan will continue.',
			// 				components: [],
			// 			});
			// 		}
			// 	});
			// } else {
			return interaction.editReply({
				content:
					'There is a scan in progress, please wait for it to be finished before using another `/manage-cat` command',
				ephemeral: true,
			});
			// }
		}

		const application = await client.application.fetch();

		if (subcommandGroup === 'status') {
			const oldValue = guildPreferences.cat.enabled;

			if (subcommand === 'enable') {
				const scan = interaction.options.getBoolean('scan');

				guildPreferences.cat.enabled = true;

				if (oldValue === guildPreferences.cat.enabled) {
					return interaction.editReply(
						`Cat stats are already being tracked, if there's an issue with stats please contact ${application.owner}.`,
					);
				} else {
					try {
						if (!scan) {
							await guildPreferences.save();

							interaction.editReply(
								`Cat stats are now being recorded in this server.`,
							);
						} else {
							const reply = await interaction.editReply({
								content:
									'Are you sure you want to scan all messages in this server? This could take a couple hours or longer, depending on server size and **will instantly delete all existing stats which cannot be retrieved and is currently unable to be stopped once started**.',
								components: [row],
							});

							const userResponse = await reply.createMessageComponentCollector({
								ComponentType: ComponentType.Button,
								filter,
								time: 60_000,
								max: 1,
							});

							userResponse.on('end', async (i) => {
								const response = i.values().next().value;

								if (response?.customId === 'confirm') {
									// Scan server
									const botMember = interaction.guild.members.cache.get(
										client.user.id,
									);
									const textChannels = interaction.guild.channels.cache.filter(
										(channel) =>
											channel.isTextBased() &&
											channel
												.permissionsFor(botMember)
												.has(PermissionFlagsBits.ViewChannel),
									);

									guildPreferences.cat.scanning = true;

									await guildPreferences.save();

									await Cat.deleteMany({ guildId: interaction.guild.id });

									await processChannelsInChunks(
										textChannels,
										interaction,
										interaction.guild.id,
										guildPreferences,
										client,
									);
								} else {
									await guildPreferences.save();

									return interaction.editReply({
										content: 'Scan cancelled. Cat Stats have been enabled.',
										components: [],
									});
								}
							});
						}
					} catch (e) {
						interaction.editReply({
							content:
								'There was an error enabling cat stats for this server, please try again in a minute.',
							components: [],
						});
						console.error(
							`There was an error enabling cat stats for ${interaction.guild.name} (${guildId})`,
							e,
						);
					}
				}
			} else if (subcommand === 'disable') {
				const reset = interaction.options.getBoolean('reset');

				guildPreferences.cat.enabled = false;

				if (oldValue === guildPreferences.cat.enabled.valueOf()) {
					return interaction.editReply(
						`Cat stats are already paused, if there's an issue with stats please contact ${application.owner}.`,
					);
				} else {
					await guildPreferences.save();

					if (reset) {
						const reply = await interaction.editReply({
							content:
								'Are you sure you want to reset stats for all users? **You cannot undo this action**\n\nIf you wish to just delete for specific users, please use the `/manage-cat config reset` command (coming soon:tm:).',
							components: [row],
						});

						const userResponse = await reply.createMessageComponentCollector({
							ComponentType: ComponentType.Button,
							filter,
							time: 60_000,
							max: 1,
						});

						userResponse.on('end', async (i) => {
							const response = i.values().next().value;

							if (response?.customId === 'confirm') {
								// Reset stats for all users in the guild
								const filter = { guildId };

								await Cat.deleteMany(filter);

								interaction.editReply({
									content: 'Cat stats reset and tracking paused.',
									components: [],
								});
							} else {
								return interaction.editReply({
									content: 'Reset cancelled. Cat Stats have been paused.',
									components: [],
								});
							}
						});
					} else {
						interaction.editReply(`Cat stats are now paused for this server.`);
					}
				}
			}
		} else if (subcommandGroup === 'config') {
			if (subcommand === 'removed-users') {
				const oldValue = guildPreferences.cat.allowRemovedMembers;

				const allow = interaction.options.getBoolean('allow');

				guildPreferences.cat.allowRemovedMembers = allow;

				console.log(oldValue, guildPreferences.cat.allowRemovedMembers);

				if (oldValue === guildPreferences.cat.allowRemovedMembers) {
					return interaction.editReply({
						content: `Cat stats are already ${
							allow ? 'allowing' : 'not allowing'
						} users who are no longer in the server to be on the leaderboards. If there's an issue with this please contact ${
							application.owner
						}.`,
					});
				} else {
					await guildPreferences.save();

					interaction.editReply({
						content: `Cat stats will now ${
							allow ? 'allow' : 'not allow'
						} users who are no longer in the server to be on the leaderboards.`,
					});
				}
			}
		} else if (subcommandGroup === null) {
			// } else if (subcommandGroup === 'scan') {
			if (subcommand === 'scan') {
				// if (subcommand === 'start') {
				const reply = await interaction.editReply({
					content:
						'Are you sure you want to scan all messages in this server? This could take a couple hours or longer, depending on server size and **will instantly delete all existing stats which cannot be retrieved and is currently unable to be stopped once started**.',
					components: [row],
				});

				const userResponse = await reply.createMessageComponentCollector({
					ComponentType: ComponentType.Button,
					filter,
					time: 60_000,
					max: 1,
				});

				userResponse.on('end', async (i) => {
					const response = i.values().next().value;

					if (response?.customId === 'confirm') {
						// Scan server
						const botMember = interaction.guild.members.cache.get(
							client.user.id,
						);
						const textChannels = interaction.guild.channels.cache.filter(
							(channel) =>
								channel.isTextBased() &&
								channel
									.permissionsFor(botMember)
									.has(PermissionFlagsBits.ViewChannel),
						);

						guildPreferences.cat.scanning = true;

						await guildPreferences.save();

						await Cat.deleteMany({ guildId: interaction.guild.id });

						await processChannelsInChunks(
							textChannels,
							interaction,
							interaction.guild.id,
							guildPreferences,
							client,
						);
					} else {
						return interaction.editReply({
							content: 'Scan cancelled.',
							components: [],
						});
					}
				});
			}
			// } else if (subcommand === 'stop') {
			// 	if (guildPreferences.cat.scanning === false) {
			// 		return interaction.editReply('There is no scan in progress.');
			// 	}
			// }
		}
		// } else if (subcommandGroup === 'config') {
		// if (subcommand === 'reset') {
		// 	const allUsers = interaction.options.getBoolean('all');
		// 	let usersToReset = interaction.options?.getString('users');
		// // 	const rolesToReset = interaction.options?.getRole('role');

		// 	let noMembers = [];

		// 	if (allUsers === true && (usersToReset || rolesToReset)) {
		// 		return interaction.editReply(
		// 			'Please either select false for all and select users/roles or just true for all.',
		// 		);
		// 	} else if (!allUsers && !usersToReset && !rolesToReset) {
		// 		return interaction.editReply(
		// 			'Please specify users/roles to reset stats for.',
		// 		);
		// 	}

		// 	if (allUsers) {
		// 		// Reset stats for all users in the guild
		// 		const filter = { guildId };

		// 		await Cat.deleteMany(filter);

		// 		return interaction.editReply('Cat stats reset.');
		// 	} else if (usersToReset) {
		// 		let deletedStatsEmbed = new EmbedBuilder().setTitle(
		// 			`Deleted Cat Stats for ${interaction.guild.name}`,
		// 		);

		// 		// Reset stats for specific mentioned users
		// 		if (usersToReset.includes(' ')) {
		// 			usersToReset = usersToReset.split(' ');
		// 		} else {
		// 			usersToReset = [usersToReset];
		// 		}

		// 		let members = [];

		// 		let memberFields = [];
		// 		let noMemberFields = [];
		// 		// const membersToReset = [];

		// 		for (const user in usersToReset) {
		// 			console.log(user, usersToReset[user]);

		// 			// Fetch the user's stats in cat
		// 			let memberFound = await Cat.find({
		// 				guildId,
		// 				userId: usersToReset[user],
		// 			})

		// 			if(!memberFound) {
		// 				memberFound = interaction.guild.members.cache.find((member) => {
		// 					return (
		// 						member.user.username.toLowerCase() ===
		// 							usersToReset[user].toLowerCase() ??
		// 						member.user.id === usersToReset[user]
		// 					);
		// 				});

		// 				if (!memberFound) {
		// 					memberFound = await interaction.guild.members.fetch(usersToReset[user]);
		// 				}
		// 			}

		// 			if (memberFound) {
		// 				members.push(memberFound);
		// 			} else {
		// 				noMembers.push(usersToReset[user]);
		// 			}
		// 		}

		// 		if (members.length > 0 || noMembers.length > 0) {
		// 			let description = '';

		// 			if (members.length > 0) {
		// 				deletedStatsEmbed.addFields({
		// 					name: 'Deleted member stats:',
		// 					value: '\n',
		// 				});

		// 				for (const member of members) {
		// 					const query = {
		// 						guildId,
		// 						userId: member.id,
		// 					};

		// 					try {
		// 						// Find the user's cat stats document and reset their stats
		// 						await Cat.deleteOne(query);

		// 						deletedStatsEmbed.addFields({
		// 							name: '\n',
		// 							value: `${member.nickname || member.user.username}`,
		// 							inline: true,
		// 						});
		// 					} catch (error) {
		// 						console.error(
		// 							`Error deleting stats for ${member.id}: ${error}`,
		// 						);
		// 						// Handle errors if needed
		// 					}
		// 				}

		// 				description = `Deleted ${
		// 					members.length > 1
		// 						? `${members.length} members' stats`
		// 						: "1 member's stat"
		// 				}`;

		// 				deletedStatsEmbed.addFields(memberFields);
		// 			}

		// 			if (noMembers.length > 0) {
		// 				noMemberFields.push({
		// 					name: 'Failed to delete for:',
		// 					value: '\n',
		// 				});

		// 				for (const member of noMembers) {
		// 					noMemberFields.push({
		// 						name: '\n',
		// 						value: member,
		// 						inline: true,
		// 					});
		// 				}

		// 				noMemberFields.push({
		// 					name: '\n',
		// 					value:
		// 						'Please make sure that the username or user ID is correct.',
		// 				});

		// 				if (description) {
		// 					description += ` and failed to delete stats for ${
		// 						noMembers.length > 1
		// 							? `${noMembers.length} members.`
		// 							: '1 member.'
		// 					}`;

		// 					deletedStatsEmbed.addFields(noMemberFields);
		// 				} else {
		// 					description =
		// 						'Failed to delete stats for all requests. Please make sure that the usernames or user IDs are correct.';
		// 				}
		// 			}

		// 			deletedStatsEmbed.setDescription(description);
		// 		}

		// 		interaction.editReply({ embeds: [deletedStatsEmbed] });
		// 	}
		// } else
		// }

		// manage-cat config user <@user> <stat (idk how to do multiple atm)> <number (either to add or total)>
		// unless I do same as logging and have multiple stat options and then the number will be amount to add
	},
};
