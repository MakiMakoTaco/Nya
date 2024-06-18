const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addElement, sendEmbedPaged } = require('../../utils/pages');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('The help commands')
		.addStringOption((command) =>
			command
				.setName('command')
				.setDescription('The name of a command to get help about')
				.addChoices(
					{ name: 'manage-cat', value: 'manage-cat' },
					{ name: 'cat', value: 'cat' },
				),
		),

	run: async ({ interaction, client, handler }) => {
		await interaction.deferReply();

		const allCommands = handler.commands.map((command) => command);

		const getCommand = interaction.options?.getString('command')?.toLowerCase();

		if (getCommand) {
			let foundCommand = allCommands
				.filter((cmd) => cmd.options?.devOnly !== true)
				.find((cmd) => cmd.data.name.toLowerCase() === getCommand);

			if (foundCommand) {
				let subcommands = [];
				let commandFields = [];

				let firstOptions = [];
				let secondOptions = [];
				let thirdOptions = [];

				let tempCommandFields = [];

				commandTitle = foundCommand.data.name;

				if (foundCommand.data.options?.length > 0) {
					for (let a2 = 0; a2 < foundCommand.data.options.length; a2++) {
						firstOptions.push(foundCommand.data.options[a2]);
					}

					for (let a = 0; a < firstOptions.length; a++) {
						if (!firstOptions[a]?.type) {
							subcommands.push(firstOptions[a]);

							if (subcommands[0].options?.length > 0) {
								for (let b2 = 0; b2 < subcommands[0].options.length; b2++) {
									secondOptions.push(subcommands[0].options[b2]);
								}

								for (let b = 0; b < secondOptions.length; b++) {
									if (!secondOptions[b]?.type) {
										subcommands.push(secondOptions[b]);

										if (subcommands[1].options?.length > 0) {
											for (
												let c2 = 0;
												c2 < subcommands[1].options.length;
												c2++
											) {
												thirdOptions.push(subcommands[1].options[c2]);
											}

											for (let c = 0; c < thirdOptions.length; c++) {
												if (!thirdOptions[c]?.required) {
													tempCommandFields.push(`[${thirdOptions[c].name}]`);
												} else {
													tempCommandFields.push(`<${thirdOptions[c].name}>`);
												}
											}

											commandFields.push({
												name: `${foundCommand.data.name} ${
													subcommands[0].name
												} ${subcommands[1].name} ${tempCommandFields.join(
													' ',
												)}`,
												value: subcommands[1].description,
											});

											thirdOptions = [];
											tempCommandFields = [];
										} else {
											commandFields.push({
												name: `${foundCommand.data.name} ${subcommands[0].name} ${subcommands[1].name}`,
												value: subcommands[1].description,
											});
										}

										subcommands.splice(-1);
									} else {
										if (!secondOptions[b]?.required) {
											tempCommandFields.push(`[${secondOptions[b].name}]`);
										} else {
											tempCommandFields.push(`<${secondOptions[b].name}>`);
										}
									}
								}

								if (tempCommandFields.length != 0) {
									commandFields.push({
										name: `${foundCommand.data.name} ${
											subcommands[0].name
										} ${tempCommandFields.join(' ')}`,
										value: subcommands[0].description,
									});
								}

								tempCommandFields = [];
								secondOptions = [];
							} else {
								commandFields.push({
									name: `${foundCommand.data.name} ${subcommands[0].name}`,
									value: subcommands[0].description,
								});
							}

							subcommands.splice(-1);
						} else {
							if (!firstOptions[a]?.required) {
								tempCommandFields.push(`[${firstOptions[a].name}]`);
							} else {
								tempCommandFields.push(`<${firstOptions[a].name}>`);
							}
						}
					}

					if (tempCommandFields.length != 0) {
						commandFields.push({
							name: `${foundCommand.data.name} ${tempCommandFields.join(' ')}`,
							value: foundCommand.data.description,
						});
					}

					tempCommandFields = [];
					firstOptions = [];
				} else {
					commandFields.push({
						name: foundCommand.data.name,
						value: foundCommand.data.description,
					});
				}

				const helpFields = addElement(commandFields);

				const helpEmbed = new EmbedBuilder().setTitle(foundCommand.data.name);

				await sendEmbedPaged(interaction, helpEmbed, helpFields);
			} else {
				interaction.reply('That is not a command');
			}
		} else {
			const categorizedCommands = {
				MISC: [],
				MODERATOR: [],
				ADMIN: [],
			};

			allCommands
				.filter(
					(cmd) => cmd.options?.devOnly !== true && cmd.data.name !== 'help',
				) // Exclude commands marked as devOnly
				.forEach((cmd) => {
					if (cmd.category === 'admin') {
						categorizedCommands.ADMIN.push(cmd);
					} else if (cmd.category === 'moderation') {
						categorizedCommands.MODERATOR.push(cmd);
					} else {
						categorizedCommands.MISC.push(cmd);
					}
				});

			const helpEmbed = new EmbedBuilder()
				.setTitle('Help')
				.setDescription('**HELP COMMANDS -**');

			const commandFields = [];

			for (const category in categorizedCommands) {
				const commands = categorizedCommands[category];

				if (commands.length > 0) {
					commands.forEach((command) => {
						commandFields.push({
							name: `/${command.data.name}`,
							value: command.data.description,
						});
					});
				}
			}

			const helpFields = addElement(commandFields, 6);

			await sendEmbedPaged(interaction, helpEmbed, helpFields);
		}
	},
};
