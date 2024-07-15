const { channelLink } = require("discord.js");
const { model, Schema } = require("mongoose");

const channelSchema = new Schema({
  channelId: String,
  channelUsername:String,
  channelInviteLink:String,
  title:String,
  addedBy: String,
});

const Channel = model("Channel", channelSchema);
module.exports = Channel;