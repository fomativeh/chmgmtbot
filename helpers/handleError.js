const Queue = require("queue-promise");
// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process 25 requests at in 3 seconds
  interval: 3000, // Interval between dequeue operations (3 seconds)
});

module.exports = handleError = async (error, ctx) => {
  console.log(error);
  queue.enqueue(async () => {
    if (ctx) {
      await ctx.reply("An error occured.");
    }
  });
};
