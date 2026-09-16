const systemService = require('./system.service');

const getSettings = async (req, res, next) => {
  try {
    const settings = await systemService.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updated = await systemService.updateSettings(req.body);
    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
