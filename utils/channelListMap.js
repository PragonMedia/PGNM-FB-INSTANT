const CHANNEL_LIST_MAP = {
  fb: "222",
  gg: "223",
};

function getListIdForChannel(channel) {
  if (!channel) {
    return null;
  }

  return CHANNEL_LIST_MAP[channel] || null;
}

module.exports = {
  CHANNEL_LIST_MAP,
  getListIdForChannel,
};
