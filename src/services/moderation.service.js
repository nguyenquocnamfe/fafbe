const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-testing'
});

/**
 * Moderate content using OpenAI Moderation API
 * @param {string} content - Text content to moderate
 * @returns {Promise<{approved: boolean, flagged: boolean, categories: object, scores: object}>}
 */
exports.moderateContent = async (content) => {
  try {
    // If no API key or in test mode, auto-approve
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy-key-for-testing') {
      console.log('[Moderation] No API key - auto-approving content');
      return {
        approved: true,
        flagged: false,
        categories: {},
        scores: {}
      };
    }

    // Call OpenAI Moderation API
    const moderation = await openai.moderations.create({
      input: content,
    });

    const result = moderation.results[0];
    
    return {
      approved: !result.flagged,
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores
    };

  } catch (error) {
    console.error('[Moderation] Error calling OpenAI:', error.message);
    
    // On error, auto-approve to not block users
    // In production, you might want to handle this differently
    return {
      approved: true,
      flagged: false,
      categories: {},
      scores: {},
      error: error.message
    };
  }
};

/**
 * Get moderation status string
 * @param {boolean} approved 
 * @returns {string} 'APPROVED' or 'REJECTED'
 */
exports.getModerationStatus = (approved) => {
  return approved ? 'APPROVED' : 'REJECTED';
};
