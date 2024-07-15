module.exports = useAdminAuth = (ctx) => {
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
