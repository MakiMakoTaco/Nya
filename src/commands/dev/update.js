const { exec } = require('child_process');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update')
		.setDescription('Updates and restarts the bot'),

	run: async ({ interaction }) => {
		await interaction.reply('Pulling from git...');

		// Execute git pull
		exec('git pull', async (error, stdout) => {
			if (error) {
				console.error(`Error executing git pull: ${error.message}`);
				await interaction.editReply(`Error pulling: ${error.message}`);
				return;
			}

			if (stdout.includes('Already up to date.')) {
				await interaction.editReply('Bot is already up to date');
				return;
			}

			await interaction.editReply(
				`Pull successful! \n\`${stdout}\`\nRestarting...`,
			);

			process.exit(1);
		});
	},

	options: {
		devOnly: true,
	},
};
