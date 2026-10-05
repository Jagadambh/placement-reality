require('dotenv').config();
const mongoose = require('mongoose');
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');

async function cleanHarishPost() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
  await mongoose.connect(mongoUri);

  const posts = await CommunityPost.find({
    $or: [
      { authorName: { $regex: /Harish/i } },
      { authorPseudonym: { $regex: /KIITian_Dev/i } },
      { title: { $regex: /KIIT CSE 2024-25 placements/i } },
    ],
  });

  console.log(`Found ${posts.length} posts matching Harish Sonkar to delete.`);
  for (const p of posts) {
    const cRes = await CommunityComment.deleteMany({ postId: p._id });
    console.log(`Deleted post: "${p.title}" and ${cRes.deletedCount} associated comments.`);
    await CommunityPost.deleteOne({ _id: p._id });
  }

  // Also remove any remaining comments authored by Harish
  const remainingComments = await CommunityComment.deleteMany({
    $or: [
      { authorName: { $regex: /Harish/i } },
      { authorPseudonym: { $regex: /KIITian_Dev/i } },
    ],
  });
  console.log(`Deleted ${remainingComments.deletedCount} comments authored by Harish Sonkar.`);

  console.log('✓ Successfully cleaned Harish Sonkar data from Campus Community.');
  process.exit(0);
}

cleanHarishPost().catch((err) => {
  console.error(err);
  process.exit(1);
});
