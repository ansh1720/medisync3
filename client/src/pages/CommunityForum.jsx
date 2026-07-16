import { useState, useEffect, useCallback } from 'react';
import { forumAPI } from '../utils/api';
import { 
  ChatBubbleLeftIcon, 
  HeartIcon, 
  UserIcon, 
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TagIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const CATEGORIES = [
  { value: 'all', label: 'All Posts', color: 'gray' },
  { value: 'my_posts', label: 'My Posts', color: 'violet' },
  { value: 'general', label: 'General Health', color: 'blue' },
  { value: 'mental_health', label: 'Mental Health', color: 'purple' },
  { value: 'nutrition', label: 'Nutrition & Diet', color: 'green' },
  { value: 'fitness', label: 'Fitness & Exercise', color: 'orange' },
  { value: 'chronic_conditions', label: 'Chronic Conditions', color: 'red' },
  { value: 'womens_health', label: 'Women\'s Health', color: 'pink' },
  { value: 'mens_health', label: 'Men\'s Health', color: 'indigo' },
  { value: 'pediatrics', label: 'Children\'s Health', color: 'yellow' },
  { value: 'seniors', label: 'Senior Health', color: 'gray' },
  { value: 'medications', label: 'Medications', color: 'teal' },
  { value: 'support', label: 'Support & Recovery', color: 'emerald' }
];

function CommunityForum() {
  const getFallbackPosts = () => {
    const now = new Date();
    return [
      {
        _id: 'fallback-1',
        title: 'Tips for Managing Diabetes',
        category: 'chronic_conditions',
        tags: ['diabetes', 'blood sugar', 'diet'],
        userId: { name: 'Community Member' },
        stats: { likes: 12, comments: 5, views: 45 },
        isLiked: false,
        createdAt: new Date(now - 2 * 60 * 60 * 1000)
      },
      {
        _id: 'fallback-2',
        title: 'Best exercises for weight loss?',
        category: 'fitness',
        tags: ['exercise', 'weight loss', 'fitness'],
        userId: { name: 'Sarah Smith' },
        stats: { likes: 8, comments: 12, views: 67 },
        isLiked: false,
        createdAt: new Date(now - 5 * 60 * 60 * 1000)
      },
      {
        _id: 'fallback-3',
        title: 'Dealing with anxiety and stress',
        category: 'mental_health',
        tags: ['anxiety', 'stress', 'mental health'],
        userId: { name: 'Mike Johnson' },
        stats: { likes: 15, comments: 8, views: 89 },
        isLiked: false,
        createdAt: new Date(now - 8 * 60 * 60 * 1000)
      },
      {
        _id: 'fallback-4',
        title: 'Healthy meal prep ideas',
        category: 'nutrition',
        tags: ['nutrition', 'meal prep', 'healthy eating'],
        userId: { name: 'Emily Davis' },
        stats: { likes: 20, comments: 15, views: 123 },
        isLiked: false,
        createdAt: new Date(now - 12 * 60 * 60 * 1000)
      },
      {
        _id: 'fallback-5',
        title: 'Managing high blood pressure naturally',
        category: 'chronic_conditions',
        tags: ['hypertension', 'blood pressure', 'lifestyle'],
        userId: { name: 'Robert Wilson' },
        stats: { likes: 10, comments: 7, views: 56 },
        isLiked: false,
        createdAt: new Date(now - 24 * 60 * 60 * 1000)
      }
    ];
  };

  const [posts, setPosts] = useState([]);
  const [userCreatedPosts, setUserCreatedPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('userCreatedPosts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading user posts from localStorage:', error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Post detail / reply modal state
  const [selectedPost, setSelectedPost] = useState(null); // full post data
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // Create post form state
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // Save user-created posts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('userCreatedPosts', JSON.stringify(userCreatedPosts));
    } catch (error) {
      console.error('Error saving user posts to localStorage:', error);
    }
  }, [userCreatedPosts]);

  // Load posts
  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, searchQuery]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // If My Posts is selected, just show user-created posts without API call
      if (selectedCategory === 'my_posts') {
        let filteredUserPosts = userCreatedPosts;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredUserPosts = filteredUserPosts.filter(post => 
            post.title.toLowerCase().includes(query) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
          );
        }
        setPosts(filteredUserPosts);
        setIsLoading(false);
        return;
      }
      
      const params = {
        limit: 20,
        sort: '-createdAt' // Latest first
      };
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      console.log('Fetching posts with params:', params);
      const response = await forumAPI.getPosts(params);
      console.log('Posts response:', response.data);
      
      // Handle different response structures
      let postsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          postsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data.posts)) {
          postsData = response.data.data.posts;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          postsData = response.data.data;
        } else if (response.data.posts && Array.isArray(response.data.posts)) {
          postsData = response.data.posts;
        }
      }
      
      console.log('Setting posts data:', postsData);
      
      // Always merge API posts with fallback posts to ensure visibility
      const allFallbackPosts = getFallbackPosts();
      let fallbackToShow = allFallbackPosts;
      
      if (selectedCategory !== 'all') {
        // Filter fallback posts by category
        fallbackToShow = allFallbackPosts.filter(post => post.category === selectedCategory);
      }
      
      if (searchQuery.trim()) {
        // Filter fallback posts by search query
        const query = searchQuery.toLowerCase();
        fallbackToShow = fallbackToShow.filter(post => 
          post.title.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Filter user-created posts by category and search
      let filteredUserPosts = userCreatedPosts;
      if (selectedCategory !== 'all') {
        filteredUserPosts = filteredUserPosts.filter(post => post.category === selectedCategory);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredUserPosts = filteredUserPosts.filter(post => 
          post.title.toLowerCase().includes(query) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
        );
      }
      
      // Merge user-created posts, API posts, and fallback posts safely
      // Keep only one instance per unique _id to prevent duplicate React keys
      const uniquePostsMap = new Map();
      
      // 1. Add user-created posts (local state/cache)
      filteredUserPosts.forEach(post => {
        if (post && post._id) {
          uniquePostsMap.set(post._id, post);
        }
      });
      
      // 2. Add API posts (overwrites local ones with updated likes/replies stats)
      postsData.forEach(post => {
        if (post && post._id) {
          uniquePostsMap.set(post._id, post);
        }
      });
      
      // 3. Add fallback posts if not already present
      fallbackToShow.forEach(post => {
        if (post && post._id && !uniquePostsMap.has(post._id)) {
          uniquePostsMap.set(post._id, post);
        }
      });
      
      const mergedPosts = Array.from(uniquePostsMap.values());
      setPosts(mergedPosts);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error(error.response?.data?.message || 'Failed to load posts');
      // Show fallback posts on error, with category and search filtering
      const allFallbackPosts = getFallbackPosts();
      let fallbackToShow = allFallbackPosts;
      
      if (selectedCategory !== 'all') {
        fallbackToShow = allFallbackPosts.filter(post => post.category === selectedCategory);
      }
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        fallbackToShow = fallbackToShow.filter(post => 
          post.title.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      setPosts(fallbackToShow);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  // Create new post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }
    
    if (newPost.title.trim().length < 5 || newPost.title.trim().length > 200) {
      toast.error('Title must be between 5 and 200 characters');
      return;
    }
    
    if (newPost.content.trim().length < 10 || newPost.content.trim().length > 5000) {
      toast.error('Content must be between 10 and 5000 characters');
      return;
    }

    setIsCreating(true);
    
    try {
      const postData = {
        title: newPost.title.trim(),
        body: newPost.content.trim(),
        category: newPost.category,
        tags: newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      console.log('Creating post:', postData);
      console.log('Post data types:', {
        title: typeof postData.title,
        body: typeof postData.body,
        category: typeof postData.category,
        tags: Array.isArray(postData.tags),
        tagsLength: postData.tags.length
      });
      
      const response = await forumAPI.createPost(postData);
      console.log('Create post response:', response.data);
      
      toast.success('Post created successfully!');
      
      // Reset form and close modal
      setNewPost({ title: '', content: '', category: 'general', tags: '' });
      setShowCreatePost(false);
      
      // Add the new post to user-created posts to preserve it across fetches
      if (response.data && response.data.data) {
        const newPostData = response.data.data;
        setUserCreatedPosts(prev => [newPostData, ...prev]);
      }
      
    } catch (error) {
      console.error('Create post error:', error);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error status:', error.response?.status);
      console.error('Full error response:', error.response);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 'Failed to create post';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors && validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        toast.error(`Validation Error: ${validationErrors[0].msg}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Helper to verify if an ID is a MongoId
  const isMongoId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  // Like/unlike post — uses API response for accurate count, or handles fallbacks locally
  const handleLikePost = async (postId, e) => {
    if (e) e.stopPropagation();

    // Handle fallback posts locally in memory
    if (!isMongoId(postId)) {
      const updatePostLocal = (post) => {
        if (post._id !== postId) return post;
        const currentLikes = post.stats?.likes ?? post.likes ?? 0;
        const nextLiked = !post.isLiked;
        return {
          ...post,
          isLiked: nextLiked,
          stats: { ...(post.stats || {}), likes: nextLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1) },
        };
      };
      setPosts(prevPosts => prevPosts.map(updatePostLocal));
      setSelectedPost(prev => prev?._id === postId ? updatePostLocal(prev) : prev);
      return;
    }

    try {
      const response = await forumAPI.likePost(postId);
      const { liked, totalLikes } = response.data.data;

      const updatePost = (post) => {
        if (post._id !== postId) return post;
        return {
          ...post,
          isLiked: liked,
          stats: { ...(post.stats || {}), likes: totalLikes },
        };
      };

      setPosts(prevPosts => prevPosts.map(updatePost));
      // Also update the modal if open
      setSelectedPost(prev => prev?._id === postId ? updatePost(prev) : prev);
    } catch (error) {
      console.error('Like post error:', error);
      if (error.response?.status === 404) {
        toast.error('This post no longer exists.');
        // Clean up stale posts from localStorage and view
        setUserCreatedPosts(prev => prev.filter(post => post._id !== postId));
        setPosts(prev => prev.filter(post => post._id !== postId));
        if (selectedPost?._id === postId) {
          setSelectedPost(null);
        }
      } else {
        toast.error('Failed to update like');
      }
    }
  };

  // Open post detail modal and load full post + comments
  const handleOpenPost = useCallback(async (post) => {
    setSelectedPost(post); // show modal immediately with list data
    setReplyText('');

    // For fallbacks, do not trigger API call
    if (!isMongoId(post._id)) {
      setPostDetailLoading(false);
      return;
    }

    setPostDetailLoading(true);
    try {
      const response = await forumAPI.getPost(post._id);
      const fullPost = response.data?.data || response.data;
      setSelectedPost(fullPost);
    } catch (error) {
      console.error('Failed to load full post:', error);
      if (error.response?.status === 404) {
        toast.error('This post no longer exists.');
        setSelectedPost(null);
        setUserCreatedPosts(prev => prev.filter(p => p._id !== post._id));
        setPosts(prev => prev.filter(p => p._id !== post._id));
      }
    } finally {
      setPostDetailLoading(false);
    }
  }, [selectedPost]);

  // Submit a reply on a post
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!selectedPost) return;

    // Handle replies for fallback posts locally
    if (!isMongoId(selectedPost._id)) {
      const mockComment = {
        _id: `mock-reply-${Date.now()}`,
        text: replyText.trim(),
        userId: { name: 'You (Demo)' },
        createdAt: new Date(),
        isAnonymous: false,
        replies: []
      };
      
      setSelectedPost(prev => {
        const nextComments = [mockComment, ...(prev.comments || [])];
        const nextCommentCount = nextComments.length;
        
        // Also update comment count in list view
        setPosts(prevPosts => prevPosts.map(p =>
          p._id === selectedPost._id
            ? { ...p, stats: { ...(p.stats || {}), comments: nextCommentCount } }
            : p
        ));
        
        return {
          ...prev,
          comments: nextComments,
          stats: { ...(prev.stats || {}), comments: nextCommentCount }
        };
      });
      
      setReplyText('');
      toast.success('Demo reply posted!');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const response = await forumAPI.addComment(selectedPost._id, { content: replyText.trim() });
      toast.success('Reply posted!');
      setReplyText('');
      // Reload full post to get updated comments
      const updated = await forumAPI.getPost(selectedPost._id);
      const fullPost = updated.data?.data || updated.data;
      setSelectedPost(fullPost);
      // Update comment count in the list
      setPosts(prev => prev.map(p =>
        p._id === selectedPost._id
          ? { ...p, stats: { ...(p.stats || {}), comments: fullPost.stats?.comments ?? (p.stats?.comments ?? 0) + 1 } }
          : p
      ));
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(error.response?.data?.message || 'Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now - postDate;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return postDate.toLocaleDateString();
    }
  };

  // Get category info
  const getCategoryInfo = (categoryValue) => {
    return CATEGORIES.find(cat => cat.value === categoryValue) || CATEGORIES[0];
  };

  // Get category color classes
  const getCategoryColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      pink: 'bg-pink-100 text-pink-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      teal: 'bg-teal-100 text-teal-800',
      emerald: 'bg-emerald-100 text-emerald-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    return colorMap[color] || colorMap.gray;
  };

  if (showCreatePost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => setShowCreatePost(false)}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Back to Forum
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Post
            </h1>
            <p className="text-gray-600">
              Share your health questions, experiences, or advice with the community
            </p>
          </div>

          <form onSubmit={handleCreatePost} className="card">
            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="label">
                Post Title * ({newPost.title.length}/200)
              </label>
              <input
                id="title"
                type="text"
                className={`input ${newPost.title.length < 5 || newPost.title.length > 200 ? 'border-red-300' : ''}`}
                placeholder="What would you like to discuss?"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Title must be between 5 and 200 characters
              </p>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label htmlFor="category" className="label">
                Category *
              </label>
              <select
                id="category"
                className="input"
                value={newPost.category}
                onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
              >
                {CATEGORIES.slice(1).map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div className="mb-6">
              <label htmlFor="content" className="label">
                Post Content * ({newPost.content.length}/5000)
              </label>
              <textarea
                id="content"
                rows={8}
                className={`input ${newPost.content.length < 10 || newPost.content.length > 5000 ? 'border-red-300' : ''}`}
                placeholder="Share your thoughts, questions, or experiences..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Content must be between 10 and 5000 characters
              </p>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className="label">
                Tags (Optional)
              </label>
              <input
                id="tags"
                type="text"
                className="input"
                placeholder="diabetes, exercise, medication (separate with commas)"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add relevant tags to help others find your post
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowCreatePost(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || newPost.title.length < 5 || newPost.title.length > 200 || newPost.content.length < 10 || newPost.content.length > 5000}
                className="btn btn-primary flex-1"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Community Forum
          </h1>
          <p className="text-lg text-gray-600">
            Connect with others, share experiences, and get health advice
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <button
            onClick={() => setShowCreatePost(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Post
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${selectedCategory === category.value
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Posts */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading posts...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.isArray(posts) && posts.map((post) => {
                  const categoryInfo = getCategoryInfo(post.category);
                  return (
                    <div key={post._id} className="card hover:shadow-lg transition-shadow">
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {post.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-500">
                              <span>by {post.userId?.name || post.author?.name || 'Anonymous'}</span>
                              <span>•</span>
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {formatTimeAgo(post.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Category Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColorClasses(categoryInfo.color)}`}>
                          {categoryInfo.label}
                        </span>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        <p className="text-gray-700 leading-relaxed">
                          {post.body ? (
                            post.body.length > 300 
                              ? `${post.body.substring(0, 300)}...` 
                              : post.body
                          ) : (
                            post.content ? (
                              post.content.length > 300 
                                ? `${post.content.substring(0, 300)}...` 
                                : post.content
                            ) : (
                              'Click to read more...'
                            )
                          )}
                        </p>
                      </div>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                            >
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Post Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex space-x-6">
                          <button
                            onClick={(e) => handleLikePost(post._id, e)}
                            className={`flex items-center space-x-2 text-sm transition-colors ${
                              post.isLiked 
                                ? 'text-red-600 hover:text-red-700' 
                                : 'text-gray-500 hover:text-red-600'
                            }`}
                          >
                            {post.isLiked ? (
                              <HeartSolidIcon className="h-5 w-5" />
                            ) : (
                              <HeartIcon className="h-5 w-5" />
                            )}
                            <span>{post.stats?.likes ?? post.likes ?? 0}</span>
                          </button>

                          <button
                            onClick={() => handleOpenPost(post)}
                            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <ChatBubbleLeftIcon className="h-5 w-5" />
                            <span>{post.stats?.comments ?? post.comments?.length ?? 0} replies</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleOpenPost(post)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {post.stats?.views ?? post.views ?? 0} views · Open
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && (!Array.isArray(posts) || posts.length === 0) && (
              <div className="text-center py-12">
                <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or category filter' 
                    : 'Be the first to start a conversation!'
                  }
                </p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="btn btn-primary"
                >
                  Create First Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Post Detail Modal ── */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedPost.title}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <UserIcon className="h-4 w-4" />
                  <span>{selectedPost.userId?.name || selectedPost.author?.name || 'Anonymous'}</span>
                  <span>•</span>
                  <ClockIcon className="h-4 w-4" />
                  <span>{formatTimeAgo(selectedPost.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Post body */}
              <p className="text-gray-700 leading-relaxed mb-4">
                {selectedPost.body || selectedPost.content || ''}
              </p>

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedPost.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      <TagIcon className="h-3 w-3 mr-1" />{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Like row */}
              <div className="flex items-center space-x-6 mb-6 pb-4 border-b border-gray-100">
                <button
                  onClick={(e) => handleLikePost(selectedPost._id, e)}
                  className={`flex items-center space-x-2 text-sm transition-colors ${
                    selectedPost.isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                  }`}
                >
                  {selectedPost.isLiked
                    ? <HeartSolidIcon className="h-5 w-5" />
                    : <HeartIcon className="h-5 w-5" />}
                  <span>{selectedPost.stats?.likes ?? 0} likes</span>
                </button>
                <span className="text-sm text-gray-400">
                  {selectedPost.stats?.comments ?? selectedPost.comments?.length ?? 0} replies
                </span>
              </div>

              {/* Comments / Replies */}
              <h3 className="font-semibold text-gray-800 mb-4">Replies</h3>
              {postDetailLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedPost.comments && selectedPost.comments.length > 0 ? (
                <div className="space-y-4">
                  {selectedPost.comments.map((comment, i) => (
                    <div key={comment._id || i} className="flex space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.isAnonymous ? 'Anonymous' : (comment.userId?.name || 'User')}
                          </span>
                          <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                        {/* Nested replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                            {comment.replies.map((reply, j) => (
                              <div key={reply._id || j} className="flex space-x-2">
                                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="h-3 w-3 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-gray-800 mr-2">
                                    {reply.isAnonymous ? 'Anonymous' : (reply.userId?.name || 'User')}
                                  </span>
                                  <span className="text-xs text-gray-400">{formatTimeAgo(reply.createdAt)}</span>
                                  <p className="text-sm text-gray-700 mt-0.5">{reply.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No replies yet. Be the first!</p>
              )}
            </div>

            {/* Reply input */}
            <form onSubmit={handleSubmitReply} className="p-4 border-t border-gray-100 flex gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isSubmittingReply}
              />
              <button
                type="submit"
                disabled={isSubmittingReply || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {isSubmittingReply
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  : <PaperAirplaneIcon className="h-4 w-4" />}
                Reply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityForum;