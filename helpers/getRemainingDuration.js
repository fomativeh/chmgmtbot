module.exports = getRemainingDuration = (isoString) => {
  const futureDate = new Date(isoString);
  const now = new Date();

  if (now >= futureDate) {
    return "Expired";
  }

  const diffMillis = futureDate - now;

  const diffMinutes = Math.floor(diffMillis / (1000 * 60));
  const diffHours = Math.floor(diffMillis / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays}d`;
  } else if (diffHours > 0) {
    return `${diffHours}hr`;
  } else {
    return `${diffMinutes}min`;
  }
};
