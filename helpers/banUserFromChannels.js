const Channel = require("../models/channelSchema");
const handleError = require("./handleError");
// Telegraf bot setup
const { Telegraf } = require("telegraf");
const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);
const Queue = require("queue-promise");
// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process 25 requests at in 3 seconds
  interval: 3000, // Interval between dequeue operations (3 seconds)
});

module.exports = banUserFromChannels = async (userId) => {
  queue.enqueue(async () => {
    try {
      const allChannels = await Channel.find();
      allChannels.forEach(async (eachChannel) => {
        if (eachChannel.channelUsername) {
          await bot.telegram.banChatMember(
            `@${eachChannel.channelUsername}`,
            userId
          );
        } else {
          await bot.telegram.banChatMember(`${eachChannel.channelId}`, userId);
        }
      });
    } catch (error) {
      handleError(error);
    }
  });
};
