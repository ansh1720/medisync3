/**
 * Post Model
 * Handles forum posts, comments, and social interactions
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  likes: {
    type: Number,
    min: [0, 'Likes cannot be negative'],
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    min: [0, 'Report count cannot be negative'],
    default: 0
  }
}, {
  timestamps: true
});

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  body: {
    type: String,
    required: [true, 'Post body is required'],
    trim: true,
    minlength: [10, 'Post body must be at least 10 characters'],
    maxlength: [5000, 'Post body cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: {
      values: [
        'general', 'mental_health', 'nutrition', 'fitness', 'chronic_conditions',
        'womens_health', 'mens_health', 'pediatrics', 'seniors', 'medications',
        'support', 'symptoms', 'treatment', 'prevention', 'exercise',
        'medication', 'emergency', 'experiences', 'questions', 'tips'
      ],
      message: 'Invalid post category'
    },
    default: 'general'
  },
  tags: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Maximum 10 tags
      },
      message: 'Cannot have more than 10 tags'
    },
    default: []
  },
  images: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 5; // Maximum 5 images
      },
      message: 'Cannot have more than 5 images'
    },
    default: []
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['image', 'pdf', 'document'],
      required: true
    },
    size: Number // in bytes
  }],
  likes: {
    type: Number,
    min: [0, 'Likes cannot be negative'],
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    min: [0, 'Views cannot be negative'],
    default: 0
  },
  viewedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [commentSchema],
  commentCount: {
    type: Number,
    min: [0, 'Comment count cannot be negative'],
    default: 0
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    min: [0, 'Report count cannot be negative'],
    default: 0
  },
  reportReasons: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'off_topic', 'other']
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  moderationStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected', 'under_review'],
    default: 'approved'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationNotes: String,
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
postSchema.index({ userId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ isPinned: -1, lastActivityAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: -1 });
postSchema.index({ views: -1 });
postSchema.index({ moderationStatus: 1 });
postSchema.index({ isReported: 1 });

// Text search index
postSchema.index({
  title: 'text',
  body: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    body: 1
  },
  name: 'post_text_index'
});

// Compound indexes for common queries
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for excerpt
postSchema.virtual('excerpt').get(function() {
  const maxLength = 150;
  return this.body.length > maxLength 
    ? this.body.substring(0, maxLength) + '...' 
    : this.body;
});

// Virtual for reading time (assuming 200 words per minute)
postSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.body.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Static method to get trending posts
postSchema.statics.getTrendingPosts = function(options = {}) {
  const {
    limit = 10,
    category,
    timeframe = 7 // days
  } = options;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - timeframe);

  const query = {
    createdAt: { $gte: dateThreshold },
    moderationStatus: 'approved',
    isReported: { $ne: true }
  };

  if (category) query.category = category;

  return this.find(query)
    .populate('userId', 'name role')
    .sort({ 
      likes: -1, 
      views: -1, 
      commentCount: -1,
      createdAt: -1 
    })
    .limit(limit);
};

// Static method to search posts
postSchema.statics.searchPosts = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 10,
    category,
    tags,
    sortBy = 'relevance'
  } = options;

  const query = {
    $text: { $search: searchTerm },
    moderationStatus: 'approved'
  };

  if (category) query.category = category;
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  let sort = {};
  switch (sortBy) {
    case 'recent':
      sort = { createdAt: -1 };
      break;
    case 'popular':
      sort = { likes: -1, views: -1 };
      break;
    case 'activity':
      sort = { lastActivityAt: -1 };
      break;
    default: // relevance
      sort = { score: { $meta: 'textScore' } };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('userId', 'name role')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get posts by category
postSchema.statics.getPostsByCategory = function(category, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'recent'
  } = options;

  const query = {
    category,
    moderationStatus: 'approved'
  };

  let sort = {};
  switch (sortBy) {
    case 'popular':
      sort = { likes: -1, views: -1 };
      break;
    case 'activity':
      sort = { lastActivityAt: -1 };
      break;
    default: // recent
      sort = { isPinned: -1, createdAt: -1 };
  }

  return this.find(query)
    .populate('userId', 'name role')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Instance method to add like
postSchema.methods.addLike = function(userId) {
  if (!this.likedBy.includes(userId)) {
    this.likedBy.push(userId);
    this.likes += 1;
  }
  return this.save();
};

// Instance method to remove like
postSchema.methods.removeLike = function(userId) {
  const index = this.likedBy.indexOf(userId);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likes -= 1;
  }
  return this.save();
};

// Instance method to add view
postSchema.methods.addView = function(userId = null) {
  this.views += 1;
  
  if (userId) {
    // Check if user already viewed this post recently (within 24 hours)
    const recentView = this.viewedBy.find(view => {
      return view.userId.toString() === userId.toString() &&
             (new Date() - view.viewedAt) < (24 * 60 * 60 * 1000);
    });

    if (!recentView) {
      this.viewedBy.push({ userId });
      
      // Keep only last 100 views to prevent document size issues
      if (this.viewedBy.length > 100) {
        this.viewedBy = this.viewedBy.slice(-100);
      }
    }
  }
  
  return this.save();
};

// Instance method to add comment
postSchema.methods.addComment = function(userId, text) {
  const comment = {
    userId,
    text: text.trim()
  };
  
  this.comments.push(comment);
  this.commentCount += 1;
  this.lastActivityAt = new Date();
  
  return this.save();
};

// Instance method to update comment
postSchema.methods.updateComment = function(commentId, text) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    this.lastActivityAt = new Date();
  }
  return this.save();
};

// Instance method to delete comment
postSchema.methods.deleteComment = function(commentId) {
  const comment = this.comments.id(commentId);
  if (comment) {
    this.comments.pull(commentId);
    this.commentCount = Math.max(0, this.commentCount - 1);
    this.lastActivityAt = new Date();
  }
  return this.save();
};

// Instance method to add report
postSchema.methods.addReport = function(userId, reason, description = '') {
  // Check if user already reported this post
  const existingReport = this.reportReasons.find(
    report => report.userId.toString() === userId.toString()
  );

  if (!existingReport) {
    this.reportReasons.push({
      userId,
      reason,
      description
    });
    this.reportCount += 1;
    
    // Auto-flag for review if report count exceeds threshold
    if (this.reportCount >= 3) {
      this.isReported = true;
      this.moderationStatus = 'under_review';
    }
  }
  
  return this.save();
};

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Update lastActivityAt when post is modified
  if (this.isModified('body') || this.isModified('title')) {
    this.lastActivityAt = new Date();
    this.isEdited = true;
    this.editedAt = new Date();
  }

  // Normalize tags
  if (this.isModified('tags')) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }

  next();
});

module.exports = mongoose.model('Post', postSchema);