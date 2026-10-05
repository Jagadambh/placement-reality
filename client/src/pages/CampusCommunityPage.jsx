import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { communityApi } from '../api/communityApi';
import { collegeApi } from '../api/collegeApi';
import { useAuth } from '../context/AuthContext';
import { SkeletonLoader, ErrorMessage, EmptyState } from '../components/common/FeedbackComponents';
import {
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  Eye,
  Share2,
  Bookmark,
  Sparkles,
  Flame,
  Award,
  Clock,
  HelpCircle,
  Search,
  Filter,
  PlusCircle,
  X,
  CheckCircle2,
  ShieldCheck,
  Building,
  Tag,
  CornerDownRight,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Send,
  User,
  ExternalLink,
  BookOpen,
  Info,
} from 'lucide-react';

const FLAIRS = [
  { id: 'all', label: 'All Topics', color: 'bg-slate-100 text-slate-700' },
  { id: 'Ask Campus', label: 'Ask Campus ❓', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Placement Reality', label: 'Placement Reality ⚡', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'Discussion', label: 'Discussion 💬', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Academics', label: 'Academics 📚', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Campus Life', label: 'Campus Life 🏢', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'Fees & ROI', label: 'Fees & ROI 💰', color: 'bg-green-50 text-green-800 border-green-200' },
  { id: 'Interview Prep', label: 'Interview Prep 🎯', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
];

export const CampusCommunityPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting & Filters
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'hot'); // 'hot' | 'top' | 'new' | 'questions'
  const [selectedCollegeId, setSelectedCollegeId] = useState(searchParams.get('collegeId') || 'all');
  const [selectedFlair, setSelectedFlair] = useState(searchParams.get('flair') || 'all');
  const [search, setSearch] = useState(searchParams.get('q') || '');

  // Active Thread Modal State
  const [activePost, setActivePost] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [nestedReplyText, setNestedReplyText] = useState('');

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    postType: 'question',
    flair: 'Ask Campus',
    collegeId: '',
    tags: '',
    isPseudonymous: false,
  });

  // Local vote tracking for instant UI feedback
  const [userVotes, setUserVotes] = useState({}); // { [postId]: 'up' | 'down' | null }
  const [postScores, setPostScores] = useState({}); // { [postId]: number }
  const [commentVotes, setCommentVotes] = useState({}); // { [commentId]: 'up' | 'down' | null }
  const [commentScores, setCommentScores] = useState({}); // { [commentId]: number }

  // Load Colleges & Community Stats on mount
  useEffect(() => {
    collegeApi.getColleges({ limit: 100 }).then((res) => {
      if (res.data?.success) {
        setColleges(res.data.data.colleges || []);
      }
    });

    communityApi.getStats().then((res) => {
      if (res.data?.success) {
        setCommunityStats(res.data.data);
      }
    });
  }, []);

  // Fetch Posts when filters change
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { sortBy };
      if (selectedCollegeId && selectedCollegeId !== 'all') params.collegeId = selectedCollegeId;
      if (selectedFlair && selectedFlair !== 'all') params.flair = selectedFlair;
      if (search.trim()) params.search = search.trim();

      const res = await communityApi.getPosts(params);
      if (res.data?.success) {
        const fetchedPosts = res.data.data.posts || [];
        setPosts(fetchedPosts);

        // Pre-fill local scores & user votes
        const initialVotes = {};
        const initialScores = {};
        fetchedPosts.forEach((p) => {
          initialVotes[p._id] = p.userVote || null;
          initialScores[p._id] = p.upvoteCount ?? 0;
        });
        setUserVotes((prev) => ({ ...prev, ...initialVotes }));
        setPostScores((prev) => ({ ...prev, ...initialScores }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load community discussions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortBy, selectedCollegeId, selectedFlair]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  // Upvote / Downvote Post Handler
  const handleVotePost = async (e, postId, direction) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please sign in or join transparency to upvote community posts.');
      return;
    }

    const currentVote = userVotes[postId];
    const currentScore = postScores[postId] ?? 0;
    let nextVote = direction;
    let scoreDelta = 0;

    if (currentVote === direction) {
      // Toggle off / clear
      nextVote = null;
      scoreDelta = direction === 'up' ? -1 : 1;
    } else if (currentVote === 'up' && direction === 'down') {
      scoreDelta = -2;
    } else if (currentVote === 'down' && direction === 'up') {
      scoreDelta = 2;
    } else {
      scoreDelta = direction === 'up' ? 1 : -1;
    }

    // Optimistic UI Update
    setUserVotes((prev) => ({ ...prev, [postId]: nextVote }));
    setPostScores((prev) => ({ ...prev, [postId]: currentScore + scoreDelta }));

    try {
      const res = await communityApi.votePost(postId, nextVote || 'clear');
      if (res.data?.success) {
        setPostScores((prev) => ({ ...prev, [postId]: res.data.data.upvoteCount }));
        setUserVotes((prev) => ({ ...prev, [postId]: res.data.data.userVote }));
      }
    } catch (err) {
      // Revert on error
      setUserVotes((prev) => ({ ...prev, [postId]: currentVote }));
      setPostScores((prev) => ({ ...prev, [postId]: currentScore }));
    }
  };

  // Open Full Discussion Thread
  const openPostThread = async (post) => {
    setActivePost(post);
    setLoadingThread(true);
    setReplyText('');
    setReplyingToCommentId(null);
    setNestedReplyText('');

    // Optimistically increment views in feed
    setPosts((prev) =>
      prev.map((p) => (p._id === post._id ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p))
    );

    try {
      const res = await communityApi.getPostById(post._id);
      if (res.data?.success) {
        setActivePost(res.data.data.post);
        const fetchedComments = res.data.data.comments || [];
        setThreadComments(fetchedComments);

        // Pre-fill comment votes & scores
        const cVotes = {};
        const cScores = {};
        fetchedComments.forEach((c) => {
          cVotes[c._id] = c.userVote || null;
          cScores[c._id] = c.upvoteCount ?? 0;
        });
        setCommentVotes((prev) => ({ ...prev, ...cVotes }));
        setCommentScores((prev) => ({ ...prev, ...cScores }));
      }
    } catch (err) {
      alert('Failed to load post discussion: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingThread(false);
    }
  };

  // Post top-level comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to participate in campus discussions.');
      return;
    }
    if (!replyText.trim() || !activePost) return;

    setSubmittingReply(true);
    try {
      const res = await communityApi.createComment(activePost._id, {
        content: replyText.trim(),
        isPseudonymous: false,
      });

      if (res.data?.success) {
        const newComm = res.data.data.comment;
        setThreadComments((prev) => [...prev, newComm]);
        setCommentScores((prev) => ({ ...prev, [newComm._id]: 1 }));
        setCommentVotes((prev) => ({ ...prev, [newComm._id]: 'up' }));
        setReplyText('');

        // Increment comment count on active post and in feed
        setActivePost((prev) => ({ ...prev, commentCount: (prev?.commentCount || 0) + 1 }));
        setPosts((prev) =>
          prev.map((p) => (p._id === activePost._id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
        );
      }
    } catch (err) {
      alert('Failed to submit comment: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReply(false);
    }
  };

  // Post nested reply to comment
  const handleAddNestedReply = async (parentCommentId) => {
    if (!isAuthenticated) {
      alert('Please log in to reply.');
      return;
    }
    if (!nestedReplyText.trim() || !activePost) return;

    try {
      const res = await communityApi.createComment(activePost._id, {
        content: nestedReplyText.trim(),
        parentCommentId,
        isPseudonymous: false,
      });

      if (res.data?.success) {
        const newReply = res.data.data.comment;
        setThreadComments((prev) => [...prev, newReply]);
        setCommentScores((prev) => ({ ...prev, [newReply._id]: 1 }));
        setCommentVotes((prev) => ({ ...prev, [newReply._id]: 'up' }));
        setReplyingToCommentId(null);
        setNestedReplyText('');

        setActivePost((prev) => ({ ...prev, commentCount: (prev?.commentCount || 0) + 1 }));
        setPosts((prev) =>
          prev.map((p) => (p._id === activePost._id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
        );
      }
    } catch (err) {
      alert('Failed to post reply: ' + (err.response?.data?.message || err.message));
    }
  };

  // Vote on a comment
  const handleVoteComment = async (commentId, direction) => {
    if (!isAuthenticated) {
      alert('Please log in to vote on comments.');
      return;
    }

    const currentVote = commentVotes[commentId];
    const currentScore = commentScores[commentId] ?? 0;
    let nextVote = direction;
    let scoreDelta = 0;

    if (currentVote === direction) {
      nextVote = null;
      scoreDelta = direction === 'up' ? -1 : 1;
    } else if (currentVote === 'up' && direction === 'down') {
      scoreDelta = -2;
    } else if (currentVote === 'down' && direction === 'up') {
      scoreDelta = 2;
    } else {
      scoreDelta = direction === 'up' ? 1 : -1;
    }

    setCommentVotes((prev) => ({ ...prev, [commentId]: nextVote }));
    setCommentScores((prev) => ({ ...prev, [commentId]: currentScore + scoreDelta }));

    try {
      await communityApi.voteComment(commentId, nextVote || 'clear');
    } catch (err) {
      setCommentVotes((prev) => ({ ...prev, [commentId]: currentVote }));
      setCommentScores((prev) => ({ ...prev, [commentId]: currentScore }));
    }
  };

  // Create new post submit
  const handleCreatePostSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to post a question or discussion.');
      return;
    }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      alert('Please enter both title and question/discussion details.');
      return;
    }

    setCreatingPost(true);
    try {
      const tagsArray = postForm.tags
        ? postForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await communityApi.createPost({
        ...postForm,
        tags: tagsArray,
        collegeId: postForm.collegeId || undefined,
      });

      if (res.data?.success) {
        setShowCreateModal(false);
        setPostForm({
          title: '',
          content: '',
          postType: 'question',
          flair: 'Ask Campus',
          collegeId: '',
          tags: '',
          isPseudonymous: false,
        });
        fetchPosts();
      }
    } catch (err) {
      alert('Failed to publish post: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingPost(false);
    }
  };

  // Helper: relative time formatter
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  };

  // Organize comments into top-level and children
  const { topLevelComments, childCommentsMap } = useMemo(() => {
    const topLevel = [];
    const childrenMap = {};

    threadComments.forEach((comm) => {
      if (!comm.parentCommentId) {
        topLevel.push(comm);
      } else {
        const pId = comm.parentCommentId.toString();
        if (!childrenMap[pId]) childrenMap[pId] = [];
        childrenMap[pId].push(comm);
      }
    });

    return { topLevelComments: topLevel, childCommentsMap: childrenMap };
  }, [threadComments]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* SUBREDDIT-STYLE HERO HEADER */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Top banner strip */}
          <div className="h-28 md:h-36 bg-gradient-to-r from-orange-600 via-brand-primary to-purple-800 relative">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-2xs" />
          </div>

          {/* Subreddit Identity bar */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-orange-500 border-4 border-white shadow-md flex items-center justify-center text-white flex-shrink-0">
                <MessageSquare className="w-10 h-10" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    r/CampusDiscussions
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 uppercase tracking-wider">
                    Campus Q&A Forum
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-xl">
                  The transparent community forum for Indian colleges. Real questions, honest placement reality checks, and student-verified insights.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    alert('Please sign in to ask a question or start a discussion.');
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition group"
              >
                <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                <span>Ask Question / Create Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT: FEED (LEFT) + COMMUNITY SIDEBAR (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT 8 COLS: DISCUSSION FEED */}
          <div className="lg:col-span-8 space-y-4">

            {/* QUICK CREATE BAR (Reddit Post Box) */}
            <div
              onClick={() => {
                if (!isAuthenticated) {
                  alert('Please sign in to ask a question or start a discussion.');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3 cursor-pointer hover:border-slate-300 transition"
            >
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              <input
                type="text"
                readOnly
                placeholder="Ask a question about a college or share placement insights..."
                className="w-full bg-slate-100 hover:bg-slate-200/70 cursor-pointer rounded-xl px-4 py-2 text-xs text-slate-700 focus:outline-none transition"
              />
              <button className="px-3.5 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs hover:bg-orange-100 border border-orange-200 flex-shrink-0">
                Post
              </button>
            </div>

            {/* SORT & FILTER CONTROLS (Reddit Tab Bar) */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Reddit Sort Modes: Hot, Top, New, Questions */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setSortBy('hot')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'hot' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Hot</span>
                  </button>

                  <button
                    onClick={() => setSortBy('top')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'top' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Top</span>
                  </button>

                  <button
                    onClick={() => setSortBy('new')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'new' ? 'bg-white text-brand-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>

                  <button
                    onClick={() => setSortBy('questions')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      sortBy === 'questions' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Unanswered</span>
                  </button>
                </div>

                {/* College Selector */}
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium max-w-[200px] truncate"
                  >
                    <option value="all">All Colleges / Campuses</option>
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.shortName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Flair Tag Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {FLAIRS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFlair(f.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold border transition ${
                      selectedFlair === f.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* POSTS LIST */}
            {loading ? (
              <SkeletonLoader count={4} />
            ) : error ? (
              <ErrorMessage message={error} onRetry={fetchPosts} />
            ) : posts.length === 0 ? (
              <EmptyState
                title="No discussions or questions found"
                description="Be the first student to ask a question or share verified insights about this college!"
                actionLabel="Ask a Question Now"
                onAction={() => setShowCreateModal(true)}
              />
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const userVote = userVotes[post._id];
                  const score = postScores[post._id] ?? post.upvoteCount ?? 0;

                  return (
                    <article
                      key={post._id}
                      onClick={() => openPostThread(post)}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex overflow-hidden cursor-pointer group"
                    >
                      {/* REDDIT LEFT UPVOTE/DOWNVOTE COLUMN */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-11 sm:w-12 bg-slate-50/70 p-2 flex flex-col items-center justify-start border-r border-slate-100 flex-shrink-0"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleVotePost(e, post._id, 'up')}
                          className={`p-1 rounded-md transition ${
                            userVote === 'up'
                              ? 'text-orange-600 bg-orange-100/80 font-bold'
                              : 'text-slate-400 hover:text-orange-600 hover:bg-slate-200/60'
                          }`}
                          title="Upvote"
                        >
                          <ArrowBigUp className="w-5 h-5 fill-current" />
                        </button>

                        <span
                          className={`text-xs font-black my-0.5 tracking-tight ${
                            userVote === 'up'
                              ? 'text-orange-600'
                              : userVote === 'down'
                              ? 'text-indigo-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {score}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleVotePost(e, post._id, 'down')}
                          className={`p-1 rounded-md transition ${
                            userVote === 'down'
                              ? 'text-indigo-600 bg-indigo-100/80 font-bold'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60'
                          }`}
                          title="Downvote"
                        >
                          <ArrowBigDown className="w-5 h-5 fill-current" />
                        </button>
                      </div>

                      {/* MAIN POST BODY */}
                      <div className="p-4 flex-1 space-y-2 min-w-0">
                        {/* Meta header */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {/* College community chip */}
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md hover:underline">
                            c/{post.collegeName ? post.collegeName.split(' ')[0] : 'General'}
                          </span>

                          <span>•</span>

                          {/* Author identity */}
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            {post.isPseudonymous ? post.authorPseudonym : post.authorName}
                            {post.isVerifiedStudent && (
                              <span title="Verified College Student">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              </span>
                            )}
                          </span>

                          {post.authorCollege && (
                            <span className="text-slate-400 font-normal truncate max-w-[150px]">
                              ({post.authorCollege})
                            </span>
                          )}

                          <span>•</span>

                          {/* Relative time */}
                          <span className="text-slate-400">{formatTimeAgo(post.createdAt)}</span>

                          {/* Flair Pill */}
                          {post.flair && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {post.flair}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-orange-600 transition leading-snug">
                          {post.title}
                        </h2>

                        {/* Snippet */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom action bar */}
                        <div className="flex items-center gap-4 pt-2 text-xs font-semibold text-slate-500 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 hover:text-slate-900 transition">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>{post.commentCount || 0} Comments</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{(post.viewCount || 0).toLocaleString()} Views</span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(window.location.href);
                              alert('Discussion link copied to clipboard!');
                            }}
                            className="flex items-center gap-1 hover:text-slate-900 transition ml-auto"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 4 COLS: REDDIT COMMUNITY SIDEBAR */}
          <div className="lg:col-span-4 space-y-5">

            {/* ABOUT COMMUNITY WIDGET */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">About Community</span>
                <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">r/CampusDiscussions</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                India's student-governed forum for unfiltered college truths. Ask questions about cutoff marks, placement reality, hostel food, or professor leniency without administrative censorship.
              </p>

              {/* Stats counts */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-lg font-black text-slate-900 block">
                    {communityStats?.totalPosts || posts.length}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Discussions</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-lg font-black text-emerald-600 block">
                    {communityStats?.totalComments || 18}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Answers Given</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    alert('Please sign in to ask a question or start a discussion.');
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-sm"
              >
                + Create Post
              </button>
            </div>

            {/* TOP DISCUSSED COLLEGES (TRENDING COMMUNITIES) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span>Trending Campuses</span>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Kalinga Institute of Industrial Technology (KIIT)', tag: 'c/KIIT', count: '45 threads' },
                  { name: 'Vellore Institute of Technology (VIT)', tag: 'c/VIT', count: '38 threads' },
                  { name: 'BITS Pilani (All Campuses)', tag: 'c/BITS', count: '29 threads' },
                  { name: 'Thapar Institute (TIET Patiala)', tag: 'c/Thapar', count: '21 threads' },
                  { name: 'SRM Institute of Science & Tech', tag: 'c/SRM', count: '19 threads' },
                ].map((camp, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSearch(camp.tag.replace('c/', ''))}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{camp.tag}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{camp.name}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{camp.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COMMUNITY RULES */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
                Community Rules
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                <li><strong>Constructive Transparency:</strong> Keep critiques honest and backed by real experiences.</li>
                <li><strong>No Fabrications:</strong> Do not quote fake packages or unverified hearsay.</li>
                <li><strong>Student Privacy Protection:</strong> Never post another student's phone number or personal credentials.</li>
                <li><strong>Search Before Posting:</strong> Check if a senior has already answered your branch question.</li>
              </ol>
            </div>

          </div>
        </div>

        {/* FULL DISCUSSION THREAD MODAL */}
        {activePost && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">

              {/* Thread Header Bar */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                    c/{activePost.collegeName ? activePost.collegeName.split(' ')[0] : 'Campus'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">
                    Posted by {activePost.isPseudonymous ? activePost.authorPseudonym : activePost.authorName}
                  </span>
                  {activePost.isVerifiedStudent && (
                    <span className="flex items-center gap-1 text-blue-600 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">{formatTimeAgo(activePost.createdAt)}</span>
                </div>

                <button
                  onClick={() => setActivePost(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thread Body */}
              <div className="p-6 space-y-6">

                {/* Main Post Section */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {/* Voting buttons in thread */}
                    <div className="flex flex-col items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <button
                        onClick={(e) => handleVotePost(e, activePost._id, 'up')}
                        className={`p-1 rounded transition ${
                          userVotes[activePost._id] === 'up'
                            ? 'text-orange-600 font-bold'
                            : 'text-slate-400 hover:text-orange-600'
                        }`}
                      >
                        <ArrowBigUp className="w-6 h-6 fill-current" />
                      </button>
                      <span className="text-sm font-black my-1 text-slate-800">
                        {postScores[activePost._id] ?? activePost.upvoteCount ?? 0}
                      </span>
                      <button
                        onClick={(e) => handleVotePost(e, activePost._id, 'down')}
                        className={`p-1 rounded transition ${
                          userVotes[activePost._id] === 'down'
                            ? 'text-indigo-600 font-bold'
                            : 'text-slate-400 hover:text-indigo-600'
                        }`}
                      >
                        <ArrowBigDown className="w-6 h-6 fill-current" />
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {activePost.flair && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {activePost.flair}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          {activePost.collegeName}
                        </span>
                      </div>

                      <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                        {activePost.title}
                      </h1>

                      <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed pt-2">
                        {activePost.content}
                      </div>

                      {/* Tags */}
                      {activePost.tags && activePost.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {activePost.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Views & Telemetry */}
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {(activePost.viewCount || 0).toLocaleString()} Views
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {activePost.commentCount || threadComments.length} Comments
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADD COMMENT FORM */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Comment as {user ? user.name : 'Guest'}</span>
                    {!isAuthenticated && (
                      <span className="text-amber-600 text-[11px]">Sign in to participate</span>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="What are your thoughts or answers? Share genuine facts and advice..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      disabled={!isAuthenticated || submittingReply}
                    />

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={!isAuthenticated || !replyText.trim() || submittingReply}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingReply ? 'Posting...' : 'Comment'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* THREADED COMMENTS TREE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-bold text-slate-700">
                    <span>Discussion Replies ({threadComments.length})</span>
                    <span className="text-slate-400 font-normal">Sorted by: Top Upvoted</span>
                  </div>

                  {loadingThread ? (
                    <SkeletonLoader count={3} />
                  ) : topLevelComments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No comments yet. Be the first to share an answer or insight!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topLevelComments.map((comment) => {
                        const cScore = commentScores[comment._id] ?? comment.upvoteCount ?? 0;
                        const cVote = commentVotes[comment._id];
                        const children = childCommentsMap[comment._id] || [];
                        const isReplying = replyingToCommentId === comment._id;

                        return (
                          <div key={comment._id} className="space-y-3">
                            {/* Parent Comment */}
                            <div className="flex items-start gap-3">
                              {/* Comment Vote arrows */}
                              <div className="flex flex-col items-center pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleVoteComment(comment._id, 'up')}
                                  className={`p-0.5 rounded transition ${
                                    cVote === 'up' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-orange-600'
                                  }`}
                                >
                                  <ArrowBigUp className="w-4 h-4 fill-current" />
                                </button>
                                <span className="text-[11px] font-black text-slate-700">{cScore}</span>
                                <button
                                  type="button"
                                  onClick={() => handleVoteComment(comment._id, 'down')}
                                  className={`p-0.5 rounded transition ${
                                    cVote === 'down' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-indigo-600'
                                  }`}
                                >
                                  <ArrowBigDown className="w-4 h-4 fill-current" />
                                </button>
                              </div>

                              {/* Comment Content */}
                              <div className="space-y-1.5 flex-1 bg-white p-3.5 rounded-2xl border border-slate-200">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-bold text-slate-900">
                                    {comment.isPseudonymous ? comment.authorPseudonym : comment.authorName}
                                  </span>
                                  {comment.isVerifiedStudent && (
                                    <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-[10px] bg-blue-50 px-1.5 py-0.2 rounded">
                                      <ShieldCheck className="w-3 h-3" />
                                      Verified
                                    </span>
                                  )}
                                  {comment.authorCollege && (
                                    <span className="text-slate-400">({comment.authorCollege})</span>
                                  )}
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-400">{formatTimeAgo(comment.createdAt)}</span>
                                </div>

                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                  {comment.content}
                                </p>

                                <div className="pt-1 flex items-center gap-3 text-[11px] font-bold text-slate-500">
                                  <button
                                    onClick={() => setReplyingToCommentId(isReplying ? null : comment._id)}
                                    className="hover:text-orange-600 flex items-center gap-1"
                                  >
                                    <CornerDownRight className="w-3 h-3" />
                                    <span>Reply</span>
                                  </button>
                                </div>

                                {/* Inline reply box if open */}
                                {isReplying && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                                    <textarea
                                      rows={2}
                                      value={nestedReplyText}
                                      onChange={(e) => setNestedReplyText(e.target.value)}
                                      placeholder="Write your reply..."
                                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setReplyingToCommentId(null)}
                                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleAddNestedReply(comment._id)}
                                        className="px-3 py-1 rounded-lg bg-orange-600 text-white font-bold text-xs"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Nested Child Replies (Indented Reddit Thread) */}
                            {children.length > 0 && (
                              <div className="pl-6 sm:pl-10 space-y-2.5 border-l-2 border-slate-200 ml-4">
                                {children.map((child) => (
                                  <div key={child._id} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-1">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <span className="font-bold text-slate-800">
                                        {child.isPseudonymous ? child.authorPseudonym : child.authorName}
                                      </span>
                                      {child.isVerifiedStudent && (
                                        <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                          <ShieldCheck className="w-2.5 h-2.5" />
                                          Verified
                                        </span>
                                      )}
                                      <span className="text-slate-400">{formatTimeAgo(child.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                      {child.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* CREATE POST / ASK QUESTION MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-scaleUp">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  <span>Create a Post on r/CampusDiscussions</span>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePostSubmit} className="space-y-4">
                {/* College selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Target College / Institution:
                  </label>
                  <select
                    value={postForm.collegeId}
                    onChange={(e) => setPostForm({ ...postForm, collegeId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">General Indian Engineering (Cross-Campus)</option>
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.city}, {c.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Post Topic Flair */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Choose Topic Flair:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FLAIRS.filter((f) => f.id !== 'all').map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setPostForm({ ...postForm, flair: f.id })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          postForm.flair === f.id
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Title / Question (Clear & Descriptive):
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="e.g. Is KIIT CSE worth taking over VIT AP CSE? Need honest senior reviews"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>

                {/* Post Content */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Details, Context & What you want to know:
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="Provide relevant details (e.g. fees, your rank, branch preferences, expected packages, specific questions for seniors)..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Tags (comma separated):
                  </label>
                  <input
                    type="text"
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                    placeholder="e.g. placements, cse, fees, hostel"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Anonymous / Pseudonym Toggle */}
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="anonToggle"
                    checked={postForm.isPseudonymous}
                    onChange={(e) => setPostForm({ ...postForm, isPseudonymous: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="anonToggle" className="cursor-pointer">
                    Post pseudonymously as <strong>{user?.pseudonym || 'u/Anonymous_Student'}</strong>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPost}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-sm"
                  >
                    {creatingPost ? 'Publishing...' : 'Publish Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
