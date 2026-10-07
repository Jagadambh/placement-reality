// paymentService.js – Razorpay integration (Node.js)
// ------------------------------------------------------------
// This service encapsulates all Razorpay‑related logic so the rest of the
// codebase can stay untouched.  It provides:
//   • createOrder(amount, receipt) – creates a Razorpay order and returns
//     the order details that the frontend needs to open the checkout.
//   • verifySignature(payload) – verifies the Razorpay webhook signature.
//   • handleWebhook(req, res) – Express middleware that processes Razorpay
//     payment‑success webhooks and updates the user subscription.
//
// To keep the existing files unchanged, we expose the functions via a
// dedicated service and add a lightweight controller/route that can be
// plugged into the existing Express app.

const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User'); // Adjust path if your User model lives elsewhere.

// Load credentials from environment variables.
// Add these to your .env file in production:
//   RAZORPAY_KEY_ID=your_key_id
//   RAZORPAY_KEY_SECRET=your_key_secret
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order.
 * @param {number} amountInRupees – Amount to charge (e.g., 19 for ₹19).
 * @param {string} receiptId – Unique receipt id for the order.
 * @returns {Promise<Object>} Razorpay order object.
 */
async function createOrder(amountInRupees, receiptId) {
  const amountInPaise = amountInRupees * 100; // Razorpay works in paise.
  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    payment_capture: 1, // Auto‑capture.
  };
  return razorpay.orders.create(options);
}

/**
 * Verify Razorpay webhook signature.
 * @param {Object} payload – The raw request body (string).
 * @param {string} signature – Value from header `x-razorpay-signature`.
 * @returns {boolean}
 */
function verifySignature(payload, signature) {
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  return generated === signature;
}

/**
 * Express middleware for Razorpay payment‑success webhook.
 * It expects the webhook to contain `payload.payment.entity` with the
 * `order_id` and `email` of the payer (stored as `notes.email` when the
 * order is created).
 */
async function handleWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || '';
  if (!verifySignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  if (event.event !== 'payment.captured') {
    return res.status(200).json({ status: 'ignored' });
  }

  const payment = event.payload.payment.entity;
  const email = payment.notes?.email;
  if (!email) {
    return res.status(400).json({ error: 'Missing email in notes' });
  }

  // Find user by email and extend their subscription.
  const user = await User.findOne({ email });
  if (!user) {
    // If the user does not exist, you could create a provisional record.
    return res.status(404).json({ error: 'User not found' });
  }

  // Extend subscription by 7 days from now (or from current expiry).
  const now = new Date();
  const currentExpiry = user.subscriptionExpiry || now;
  const newExpiry = new Date(Math.max(now, currentExpiry));
  newExpiry.setDate(newExpiry.getDate() + 7);
  user.subscriptionExpiry = newExpiry;
  await user.save();

  return res.json({ status: 'success', newExpiry });
}

module.exports = {
  createOrder,
  verifySignature,
  handleWebhook,
};
