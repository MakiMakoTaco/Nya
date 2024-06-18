const { Schema, model } = require('mongoose');
const statsArray = require('../objects/catStatsArray');

const statsObject = {};
statsArray.forEach((stat) => {
	statsObject[stat] = {
		type: Number,
		default: 0,
	};
});

const catSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	userId: {
		type: String,
		required: true,
	},
	existsInGuild: {
		type: Boolean,
		default: true,
	},
	stats: statsObject,
});

module.exports = model('Cat', catSchema);
