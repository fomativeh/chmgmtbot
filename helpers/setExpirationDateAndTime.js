module.exports = setExpirationDateAndTime = (duration) => {
  const regex = /^(\d+)([smhrd])$/;
  const match = duration.match(regex);

  if (!match) {
    return false;
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const now = new Date();

  switch (unit) {
    case "s":
      now.setSeconds(now.getSeconds() + value);
      break;
    case "min":
      now.setMinutes(now.getMinutes() + value);
      break;
    case "h":
      now.setHours(now.getHours() + value);
      break;
    case "d":
      now.setDate(now.getDate() + value);
      break;
    default:
      return false;
  }

  return now.toISOString();
};
