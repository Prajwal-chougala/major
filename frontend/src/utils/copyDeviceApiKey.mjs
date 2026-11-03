const copyDeviceApiKey = async (apiKey, clipboard) => {
  if (!apiKey || typeof clipboard?.writeText !== "function") {
    throw new Error("Clipboard access is unavailable in this browser.");
  }

  await clipboard.writeText(apiKey);
};

export default copyDeviceApiKey;
