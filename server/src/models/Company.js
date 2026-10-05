const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    industry: {
      type: String,
      default: 'Information Technology',
    },
    tierCategory: {
      type: String,
      enum: ['Product / FAANG+', 'Fintech / BFSI', 'Tier 1 Product', 'Mass Recruiter / IT Services', 'Core Engineering', 'Consulting', 'Startup'],
      default: 'Product / FAANG+',
    },
    website: {
      type: String,
    },
    logoUrl: {
      type: String,
    },
    verifiedHiresCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ name: 'text' });

module.exports = mongoose.model('Company', companySchema);
