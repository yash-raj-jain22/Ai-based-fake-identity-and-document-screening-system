const SystemSettings = require('./system.model');

const getSettings = async () => {
  let settings = await SystemSettings.findOne({ key: 'global_config' });
  if (!settings) {
    settings = new SystemSettings({ key: 'global_config' });
    await settings.save();
  }
  return settings;
};

const updateSettings = async (data) => {
  let settings = await SystemSettings.findOne({ key: 'global_config' });
  if (!settings) {
    settings = new SystemSettings({ key: 'global_config' });
  }

  const allowedFields = [
    'aiServiceUrl',
    'blurThreshold',
    'faceMatchThreshold',
    'tamperingSensitivity',
    'autoEscalateHighRisk',
    'workstationName',
    'audioAlerts',
    'enforceStrictDates',
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      settings[field] = data[field];
    }
  });

  await settings.save();
  return settings;
};

module.exports = {
  getSettings,
  updateSettings,
};
