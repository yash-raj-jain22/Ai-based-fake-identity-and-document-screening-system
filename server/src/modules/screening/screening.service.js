const mongoose = require('mongoose');
const Screening = require('./screening.model');

const createScreening = async (fileData, user = null) => {
  // Create a unique ID
  const screeningId = `SCR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newScreening = new Screening({
    screeningId,
    status: 'CREATED',
    document: {
      originalName: fileData.originalname,
      mimetype: fileData.mimetype,
      path: fileData.path,
      documentType: 'UNKNOWN' // Will be detected or provided by frontend
    },
    createdBy: user?._id,
    createdByName: user?.name || 'Inspector John Doe'
  });

  await newScreening.save();
  return newScreening;
};

const getScreeningById = async (id) => {
  if (!id) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
  if (isObjectId) {
    return await Screening.findOne({
      $or: [{ screeningId: id }, { _id: id }]
    });
  }
  return await Screening.findOne({ screeningId: id });
};

module.exports = {
  createScreening,
  getScreeningById
};
