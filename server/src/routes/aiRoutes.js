const express = require('express');
const router = express.Router();
const {
  chatWithAi,
  getAiConversationHistory,
  getAiStatus,
} = require('../controllers/aiController');
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/chat', aiLimiter, chatWithAi);
router.get('/conversations/:sessionId', getAiConversationHistory);
router.get('/status', getAiStatus);

module.exports = router;
