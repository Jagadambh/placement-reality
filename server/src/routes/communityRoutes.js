const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  createPost,
  votePost,
  createComment,
  voteComment,
  getCommunityStats,
} = require('../controllers/communityController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/stats', getCommunityStats);
router.get('/posts', optionalAuth, getPosts);
router.post('/posts', protect, createPost);
router.get('/posts/:id', optionalAuth, getPostById);
router.post('/posts/:id/vote', protect, votePost);
router.post('/posts/:id/comments', protect, createComment);
router.post('/comments/:id/vote', protect, voteComment);

module.exports = router;
