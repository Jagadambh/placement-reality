const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      trim: true,
      uppercase: true,
    },
    degreeLevel: {
      type: String,
      enum: ['B.Tech', 'B.E.', 'M.Tech', 'MCA', 'MBA', 'Dual Degree', 'Other'],
      default: 'B.Tech',
    },
    totalSeats: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ collegeId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
