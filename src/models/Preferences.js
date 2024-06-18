const { Schema, model } = require('mongoose');

const preferencesSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	cat: {
		enabled: {
			type: Boolean,
			default: false,
		},
		allowRemovedMembers: {
			type: Boolean,
			default: false,
		},
		scanning: {
			type: Boolean,
			default: false,
		},
	},
});

module.exports = model('Preferences', preferencesSchema);
