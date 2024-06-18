const Cat = require('../models/Cat');
const statsArray = require('../objects/catStatsArray');
const { EmbedBuilder } = require('discord.js');
// const { eventEmitter } = require('../mrrp');

let channelUpdates = {};
let oldChannelUpdates = {};

let completedChannels = 0;
let ongoingChannels = 0;
let totalMessages = 0;

// let start;
// let end;

// let stopScan = false;

// eventEmitter.once('stopScan', () => {
// 	stopScan = true;
// 	console.log('Stopped fetching messages');
// });

// Function to extract stats from messages (customize this for your needs)
const extractStatsFromMessage = (message) => {
	const catContent = message.content
		.toLowerCase()
		.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')
		.replace(/<:.+?:\d+>/g, '')
		.replace(/(.)\1{1,}/g, '$1');
	const stats = {};

	statsArray.forEach((stat) => {
		const phrase = stat.replace(/(.)\1{1,}/g, '$1'); // Default key is the phrase itself

		let regexPattern;
		if (stat === ':3') {
			regexPattern = new RegExp(`(?<=\\s|^)${phrase}(?=\\s|$)`, 'ig');
		} else {
			regexPattern = new RegExp(`\\b${phrase}\\b`, 'ig');
		}

		const matches = catContent.match(regexPattern) || [];

		stats[stat] = matches.length;
	});

	return stats;
};

// Function to update stats in the database for a user
async function updateStatsForUser(
	guildId,
	userId,
	stats,
	existsInGuild = true,
) {
	// Prepare the update object
	const update = {};
	for (const [key, value] of Object.entries(stats)) {
		update[`stats.${key}`] = value;
	}

	// Use upsert option
	await Cat.updateOne(
		{ userId: userId, guildId: guildId, existsInGuild },
		{ $inc: update },
		{ upsert: true },
	);
}

// Function to process and save messages to the database
const processAndSaveMessagesToDB = async (messages, guildId, client) => {
	const guild = client.guilds.cache.get(guildId); // Assuming 'client' is your Discord client
	for (const [id, msg] of messages) {
		if (!msg.author.bot) {
			try {
				let member = guild.members.cache.get(msg.author.id);
				if (!member) {
					try {
						member = await guild.members.fetch(msg.author.id);
					} catch (error) {
						member = null;
					}
				}

				const stats = extractStatsFromMessage(msg);
				await updateStatsForUser(
					guildId,
					msg.author.id,
					stats,
					member ? true : false,
				);
			} catch (error) {
				console.error(`Error:`, error);
			}
		}
	}
};

async function updateReply(
	interaction,
	allChannels,
	guildPreferences,
	maxAmountToShow = 10,
) {
	const message = await interaction.fetchReply();
	const amountToShow = Math.min(maxAmountToShow, ongoingChannels);

	let interval = setInterval(async () => {
		// if (stopScan) {
		// 	clearInterval(interval);

		// 	guildPreferences.cat.scanning = false;
		// 	await guildPreferences.save();

		// 	console.log('Stopped updating message');
		// }

		if (completedChannels < allChannels.length) {
			if (
				JSON.stringify(oldChannelUpdates) !== JSON.stringify(channelUpdates)
			) {
				// Update oldChannelUpdates immediately after comparing it with channelUpdates
				oldChannelUpdates = JSON.parse(JSON.stringify(channelUpdates));

				const channelUpdatesEmbed = new EmbedBuilder()
					.setTitle('Cat Scan Progress')
					.setFields(
						Object.entries(channelUpdates)
							.slice(0, amountToShow)
							.map(([channelName, updates]) => {
								return {
									name: `${channelName}: ${
										updates.processingBatch
											? `Processing ${
													updates.messagesThisBatch
											  } messages (Batch ${updates.batchNumber + 1})`
											: `${updates.scannedMessages} messages scanned`
									}`,
									value: '\n',
								};
							}),
					)
					.setFooter({
						text: `Scanned ${totalMessages} messages in ${
							completedChannels + ongoingChannels
						} channels`,
						iconURL: message.guild.iconURL(),
					})
					.setTimestamp(Date.now());

				if (completedChannels > 0) {
					channelUpdatesEmbed.setDescription(
						`Completed ${completedChannels} channels (${
							allChannels.length - completedChannels
						} remaining)`,
					);
				}

				if (
					allChannels.length - completedChannels > amountToShow ||
					ongoingChannels > amountToShow
				) {
					channelUpdatesEmbed.addFields({
						name: `And ${
							allChannels.length - completedChannels - amountToShow
						} more...`,
						value: '\n',
					});
				}

				await message.edit({
					content: '',
					embeds: [channelUpdatesEmbed],
				});
			}
		} else {
			// end = Date.now();
			clearInterval(interval);

			guildPreferences.cat.scanning = false;
			await guildPreferences.save();

			const completedScanEmbed = new EmbedBuilder()
				.setTitle('Cat Scan Complete')
				.setDescription(`Completed all ${allChannels.length} channels.`)
				.setFooter({
					text: `Scanned ${totalMessages} messages in ${allChannels.length} channels`,
					iconURL: message.guild.iconURL(),
				})
				.setTimestamp();

			await message.edit({
				embeds: [completedScanEmbed],
			});

			await interaction.followUp(
				`Finished scanning ${totalMessages} between ${allChannels.length} channels for cat stats.`,
			);
		}
	}, 1000);
}

async function processChannelsInChunks(
	channels,
	interaction,
	guildId,
	guildPreferences,
	client,
	chunkSize = 10,
) {
	await interaction.editReply({
		content: `Fetching messages, this could take a while. Please wait...`,
		components: [],
	});

	// ongoingChannels = chunkSize;

	// Convert channels to an array
	const channelsArray = Array.from(channels.values());

	updateReply(interaction, channelsArray, guildPreferences);

	// start = Date.now();

	let processingChannels = 0;
	let currentChannelIndex = 0;

	function processNextChannel() {
		if (currentChannelIndex >= channelsArray.length) {
			return;
		}

		const channel = channelsArray[currentChannelIndex];
		currentChannelIndex++;
		ongoingChannels++;

		processingChannels++;
		processChannel(channel, guildId, client).then(() => {
			processingChannels--;
			ongoingChannels--;
			if (processingChannels < chunkSize) {
				processNextChannel();
			}
		});

		if (processingChannels < chunkSize) {
			processNextChannel();
		}
	}

	processNextChannel();
}

async function processChannel(channel, guildId, client) {
	let keepFetching = true;

	let limit = 100;
	let batch = 1000;

	let batchNumber = 0;

	let lastMessageId;

	let messages = [];

	while (keepFetching) {
		try {
			const fetchedMessages = await channel.messages.fetch({
				limit,
				before: lastMessageId,
			});

			// if (stopScan) {
			// 	keepFetching = false;
			// 	console.log('Stopped fetching messages');
			// }

			if (fetchedMessages.size > 0) {
				for (const message of fetchedMessages) {
					messages.push(message);
				}

				totalMessages += fetchedMessages.size;

				lastMessageId = fetchedMessages.last().id;
			}

			if (channelUpdates[channel.name] === undefined) {
				channelUpdates[channel.name] = {
					batchNumber,
					scannedMessages: batch * batchNumber + messages.length,
					messagesThisBatch: messages.length,
					processingBatch: false,
				};
			}

			channelUpdates[channel.name].scannedMessages =
				batch * batchNumber + messages.length;
			channelUpdates[channel.name].messagesThisBatch = messages.length;

			if (messages.length >= batch || fetchedMessages.size === 0) {
				if (messages.length > 0) {
					channelUpdates[channel.name].processingBatch = true;
					await processAndSaveMessagesToDB(messages, guildId, client);
					channelUpdates[channel.name].processingBatch = false;

					messages = [];

					batchNumber++;

					channelUpdates[channel.name].batchNumber = batchNumber;
				}

				if (fetchedMessages.size === 0) {
					keepFetching = false;
				}
			}
		} catch (err) {
			console.error(`Error fetching messages in channel ${channel.id}: `, err);
			break;
		}
	}

	completedChannels++;
	delete channelUpdates[channel.name];
}

module.exports = { processChannelsInChunks };
