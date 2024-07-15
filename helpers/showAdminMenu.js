const handleError = require("./handleError");
const Queue = require("queue-promise");
// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process 25 requests at in 3 seconds
  interval: 3000, // Interval between dequeue operations (3 seconds)
});

module.exports = showAdminMenu = async (ctx) => {
  queue.enqueue(async () => {
    try {
      ctx.reply(
        "Welcome, Admin. Please use the menu commands to operate the bot.\n\nRemember to add me to a channel as an admin before adding the channel in the bot."
      );
    } catch (error) {
      handleError(error, ctx);
    }
  });
};
