const handleError = require("./handleError");
const Queue = require("queue-promise");
// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process 25 requests at in 3 seconds
  interval: 3000, // Interval between dequeue operations (3 seconds)
});

module.exports = useAdminAuth = async (ctx) => {
  queue.enqueue(async () => {
    try {
      if (ctx.from.id !== parseInt(process.env.ADMIN_ID)) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      handleError(error, ctx);
    }
  });
};
