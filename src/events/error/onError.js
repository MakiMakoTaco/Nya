const fs = require('fs');

module.exports = async (error, client) => {
	await logErrorToFile(error, client);

	process.exit(1);
};

async function logErrorToFile(error, client) {
	try {
		const application = await client.application.fetch();

		const zelda = application.owner;

		await zelda.send(`An error occurred: ${error.message}`);
		console.error(error);
	} catch (error) {
		console.error('Error alerting:', error);
	}

	const currentTime = new Date().toISOString();
	const errorMessage = `${currentTime}: ${error.stack}\n`;

	fs.appendFile('error.log', errorMessage, (err) => {
		if (err) {
			console.error('Error writing to log file:', err);
		}
	});
}
