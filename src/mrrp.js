require('dotenv').config();
const path = require('path');
const { Client, IntentsBitField } = require('discord.js');
const { CommandKit } = require('commandkit');
const mongoose = require('mongoose');
const fs = require('fs');
// const EventEmitter = require('events');
// const eventEmitter = new EventEmitter();

const client = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

async function logErrorToFile(error) {
	try {
		const zelda = await client.users.fetch('442795347849379879');

		await zelda.send(`An error occurred: ${error.message}`);
	} catch (error) {
		console.error('Error alerting:', error);
	}

	const currentTime = new Date().toISOString();
	const errorMessage = `${currentTime}: ${error}\n`;

	fs.appendFile('error.log', errorMessage, (err) => {
		if (err) {
			console.error('Error writing to log file:', err);
		}
	});
}

// Log unhandled exceptions
process.on('uncaughtException', async (error) => {
	console.error('Unhandled Exception:', error);
	await logErrorToFile(error);
	process.exit(1);
});

// Log unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	await logErrorToFile(reason);
	process.exit(1);
});

(async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI, {
			dbName: 'CatStats',
		});
		console.log('Connected to DB.');

		new CommandKit({
			client, // Discord.js client object | Required by default
			commandsPath: path.join(__dirname, 'commands'), // The commands directory
			eventsPath: path.join(__dirname, 'events'), // The events directory
			validationsPath: path.join(__dirname, 'validations'), // Only works if commandsPath is provided
			devGuildIds: ['773124995684761630'], // To register commands to dev guilds
			devUserIds: ['442795347849379879'],
			bulkRegister: true,
		});

		client.login(process.env.TOKEN);
	} catch (error) {
		await logErrorToFile(error);
		console.error('An error occurred:', error);
		process.exit(1);
	}
})();

// module.exports = { eventEmitter };
