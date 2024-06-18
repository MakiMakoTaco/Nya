const {
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
} = require('discord.js');

function addElement(array, pageLength) {
	const mainArray = [];

	array.forEach((element) => {
		if (
			mainArray.length === 0 ||
			mainArray[mainArray.length - 1].length === pageLength
		) {
			mainArray.push([element]);
		} else {
			mainArray[mainArray.length - 1].push(element);
		}
	});

	return mainArray.slice(); // Return the complete array
}

async function sendEmbedPaged(
	interaction,
	existingEmbed,
	fields,
	startLabel = 'FIRST',
	backLabel = 'BACK',
	forwardLabel = 'NEXT',
	endLabel = 'LAST',
	timeAlive = 300000,
) {
	const embed = existingEmbed.addFields(fields[0]);

	if (fields.length > 1) {
		let page = 0;
		const pages = [];

		// let start;
		// let end;

		// if (fields.length > 2) {
		// 	start = new ButtonBuilder()
		// 		.setCustomId('start')
		// 		.setLabel(startLabel)
		// 		.setStyle(ButtonStyle.Primary)
		// 		.setDisabled(true);

		// 	end = new ButtonBuilder()
		// 		.setCustomId('end')
		// 		.setLabel(endLabel)
		// 		.setStyle(ButtonStyle.Primary);
		// }

		const back = new ButtonBuilder()
			.setCustomId('back')
			.setLabel(backLabel)
			.setStyle(ButtonStyle.Primary);

		const forward = new ButtonBuilder()
			.setCustomId('forward')
			.setLabel(forwardLabel)
			.setStyle(ButtonStyle.Primary);

		const currentPage = new ButtonBuilder()
			.setCustomId('current')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		let currentPageNumber = [];

		for (let i = 0; i < fields.length; i++) {
			currentPageNumber.push(`${i + 1}/${fields.length}`);
			pages.push(EmbedBuilder.from(embed).setFields(fields[i]));
		}

		let row = new ActionRowBuilder().addComponents(
			// start.setDisabled(true),
			back.setDisabled(true),
			currentPage.setLabel(currentPageNumber[0]),
			forward,
			// end,
		);

		const response = await interaction.editReply({
			embeds: [embed],
			components: [row],
		});

		const collectorFilter = (i) => i.user.id === interaction.user.id;

		let exists = true;

		while (exists) {
			try {
				const confirmation = await response.awaitMessageComponent({
					filter: collectorFilter,
					time: timeAlive,
				});

				if (confirmation.customId === 'forward') {
					page++;
				} else {
					page--;
				}

				if (page === pages.length - 1) {
					row = new ActionRowBuilder().addComponents(
						// start.setDisabled(false),
						back.setDisabled(false),
						currentPage.setLabel(currentPageNumber[page]),
						forward.setDisabled(true),
						// end.setDisabled(true),
					);
				} else if (page === 0) {
					row = new ActionRowBuilder().addComponents(
						// start.setDisabled(true),
						back.setDisabled(true),
						currentPage.setLabel(currentPageNumber[0]),
						forward.setDisabled(false),
						// end.setDisabled(false),
					);
				} else {
					row = new ActionRowBuilder().addComponents(
						// page === 1 ? start.setDisabled(true) : start.setDisabled(false),
						back.setDisabled(false),
						currentPage.setLabel(currentPageNumber[page]),
						forward.setDisabled(false),
						// page === fields.length - 2
						// 	? end.setDisabled(true)
						// 	: start.setDisabled(false),
					);
				}

				await confirmation.update({
					embeds: [pages[page]],
					components: [row],
				});
			} catch (e) {
				exists = false;
				row = new ActionRowBuilder().addComponents(
					back.setDisabled(true),
					currentPage.setLabel(currentPageNumber[page]),
					forward.setDisabled(true),
				);

				await interaction.editReply({
					embeds: [pages[page]],
					components: [row],
				});
			}
		}
	} else {
		interaction.editReply({
			embeds: [embed],
		});
	}
}

module.exports = { addElement, sendEmbedPaged };
