const adminService = require('./admin.service');

const getUsers = async (req, res, next) => {
  try {
    const users = await adminService.listUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, badgeNumber, department } = req.body;
    const user = await adminService.createUser({
      name,
      email,
      password: password || 'DefaultPass2026!',
      role: role || 'officer',
      badgeNumber: badgeNumber || `DS-${Math.floor(1000 + Math.random() * 9000)}`,
      department: department || 'Document Screening & Triage',
    });

    res.status(201).json({
      success: true,
      message: 'Officer account created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteUser(id, req.user._id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const getSystemTelemetry = async (req, res, next) => {
  try {
    const telemetry = await adminService.getSystemHealth();

    res.status(200).json({
      success: true,
      data: telemetry,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  getSystemTelemetry,
};
