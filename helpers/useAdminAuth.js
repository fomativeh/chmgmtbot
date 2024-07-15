const handleError = require("./handleError");

module.exports = useAdminAuth = async (ctx) => {
  try {
    if (ctx.from.id !== parseInt(process.env.ADMIN_ID)) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    handleError(error, ctx);
  }
};
