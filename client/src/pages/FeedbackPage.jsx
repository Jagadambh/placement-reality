import React, { useState } from 'react';
import api from '../api/axios';

const StarRating = ({ rating, setRating, label }) => {
  return (
    <div className="flex flex-col space-y-2 mb-6">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
              rating >= star
                ? 'bg-yellow-100 text-yellow-500 scale-110 shadow-sm'
                : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500 italic">
        {rating === 1 && "Terrible"}
        {rating === 2 && "Needs improvement"}
        {rating === 3 && "It's okay"}
        {rating === 4 && "Good"}
        {rating === 5 && "Excellent"}
      </span>
    </div>
  );
};

export const FeedbackPage = () => {
  const [formData, setFormData] = useState({
    websiteRating: 0,
    websiteFeedback: '',
    realityRating: 0,
    realityFeedback: '',
    otherFeedback: '',
    name: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRating = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.websiteRating === 0 || formData.realityRating === 0) {
      setError('Please provide a rating for both questions.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/feedback', formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            We Value Your Feedback
          </h1>
          <p className="text-lg text-gray-600">
            Help us improve the platform and make the "Placement Reality" more accurate for everyone.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {submitted ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
              <p className="text-gray-600 mb-8">
                Your feedback has been received. We read every submission and use it to make this platform better for students worldwide.
              </p>
              <button 
                onClick={() => window.location.href = '/'}
                className="bg-brand-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-primary/90 transition-colors"
              >
                Return to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 sm:p-10">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-8">
                {/* Website Experience */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <StarRating 
                    rating={formData.websiteRating} 
                    setRating={(val) => handleRating('websiteRating', val)} 
                    label="1. How would you rate your overall experience with this website?" 
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Any suggestions on how we can improve the design or features?
                    </label>
                    <textarea
                      name="websiteFeedback"
                      value={formData.websiteFeedback}
                      onChange={handleChange}
                      rows="3"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-3 border bg-white"
                      placeholder="It would be great if the website had..."
                    ></textarea>
                  </div>
                </div>

                {/* Reality Data */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <StarRating 
                    rating={formData.realityRating} 
                    setRating={(val) => handleRating('realityRating', val)} 
                    label="2. How accurate do you find the 'Placement Reality' vs 'Advertised' data?" 
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Are we missing any crucial data points? Do you have insights into college placements?
                    </label>
                    <textarea
                      name="realityFeedback"
                      value={formData.realityFeedback}
                      onChange={handleChange}
                      rows="3"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-3 border bg-white"
                      placeholder="The reality stats for my college are a bit different because..."
                    ></textarea>
                  </div>
                </div>

                {/* Other */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    3. Any other comments, bugs, or feature requests?
                  </label>
                  <textarea
                    name="otherFeedback"
                    value={formData.otherFeedback}
                    onChange={handleChange}
                    rows="3"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-3 border bg-white"
                    placeholder="Optional details..."
                  ></textarea>
                </div>

                {/* Contact Info */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Want us to follow up? (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your Name"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-3 border bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Your Email"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-3 border bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                    loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-brand-primary hover:bg-brand-primary/90 hover:shadow-brand-primary/30'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
