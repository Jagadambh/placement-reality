require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
require('./models'); // Register all Mongoose models
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');
const { sendError } = require('./utils/responseHelper');
const VerificationEvidence = require('./models/VerificationEvidence');

// Route imports
const authRoutes = require('./routes/authRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const placementRoutes = require('./routes/placementRoutes');
const offerRoutes = require('./routes/offerRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const officialReportRoutes = require('./routes/officialReportRoutes');
const studentSessionReportRoutes = require('./routes/studentSessionReportRoutes');
const communityRoutes = require('./routes/communityRoutes');
const roiRoutes = require('./routes/roiRoutes');

const app = express();

// Security and middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5000'] : true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to general endpoints
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'Placement Reality Backend API',
    version: '1.0.0',
  });
});

// SECURE DOCUMENT ACCESS CONTROLLER
// Never serve offer letters publicly! Only authorized student owner, moderator, or admin can access.
app.get('/api/documents/:evidenceId', protect, async (req, res, next) => {
  try {
    const { evidenceId } = req.params;
    const evidence = await VerificationEvidence.findById(evidenceId);

    if (!evidence) {
      return sendError(res, 'Requested document not found', 404);
    }

    const isOwner = evidence.studentId.toString() === req.user._id.toString();
    const isStaff = ['admin', 'moderator'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return sendError(res, 'Access denied. Document contains confidential student credentials.', 403);
    }

    const absoluteFilePath = path.resolve(evidence.filePath);
    if (!fs.existsSync(absoluteFilePath)) {
      return sendError(res, 'Document file not found on disk storage', 404);
    }

    res.setHeader('Content-Type', evidence.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${evidence.originalFileName}"`);
    return res.sendFile(absoluteFilePath);
  } catch (error) {
    next(error);
  }
});

// API Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/official-reports', officialReportRoutes);
app.use('/api/student-session-reports', studentSessionReportRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/roi', roiRoutes);

// Serve static client build in production if available
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Placement Reality API running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
