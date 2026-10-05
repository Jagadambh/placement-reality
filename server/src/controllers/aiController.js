const crypto = require('crypto');
const AIConversation = require('../models/AIConversation');
const { processPlacementAiQuery } = require('../services/aiService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// @desc Query Placement AI Assistant
// @route POST /api/ai/chat
const chatWithAi = async (req, res, next) => {
  try {
    const { prompt, sessionId } = req.body;

    if (!prompt || prompt.trim() === '') {
      return sendError(res, 'A question or prompt is required.', 400);
    }

    const activeSessionId = sessionId || crypto.randomUUID();
    const userId = req.user ? req.user._id : null;
    const userCollegeId = req.user ? req.user.collegeId : null;

    // Retrieve or create conversation record
    let conversation = await AIConversation.findOne({ sessionId: activeSessionId });
    if (!conversation) {
      conversation = new AIConversation({
        sessionId: activeSessionId,
        userId,
        title: prompt.slice(0, 40) + '...',
        messages: [],
      });
    }

    // Process query using grounded service
    const aiResult = await processPlacementAiQuery({
      prompt,
      userCollegeId,
      conversationHistory: conversation.messages,
    });

    // Save message thread
    conversation.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    });

    conversation.messages.push({
      role: 'assistant',
      content: aiResult.answer,
      citations: aiResult.citations || [],
      timestamp: new Date(),
    });

    await conversation.save();

    return sendSuccess(
      res,
      {
        sessionId: activeSessionId,
        answer: aiResult.answer,
        citations: aiResult.citations,
        provider: aiResult.provider,
        isLiveAi: aiResult.isLiveAi,
        apiKeyConfigured: aiResult.apiKeyConfigured,
        setupNotice: aiResult.setupNotice,
      },
      'Response generated from platform ground-truth'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get conversation history
// @route GET /api/ai/conversations/:sessionId
const getAiConversationHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const conversation = await AIConversation.findOne({ sessionId });
    return sendSuccess(res, { conversation }, 'Conversation history loaded');
  } catch (error) {
    next(error);
  }
};

// @desc Get AI setup status
// @route GET /api/ai/status
const getAiStatus = async (req, res) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');

  return sendSuccess(res, {
    geminiConfigured,
    openaiConfigured,
    activeProvider: geminiConfigured ? 'Google Gemini 1.5' : openaiConfigured ? 'OpenAI GPT-4o' : 'Platform Ground-Truth RAG Engine',
    mode: geminiConfigured || openaiConfigured ? 'Live External LLM' : 'Grounded Deterministic Engine',
    isFullyFunctional: true,
  });
};

module.exports = {
  chatWithAi,
  getAiConversationHistory,
  getAiStatus,
};
