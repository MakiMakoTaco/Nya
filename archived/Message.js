const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
	content: String,
	authorId: String,
	guildId: String,
});

module.exports = mongoose.model('Message', MessageSchema);
