'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import axios from '../utils/axiosInstance';
import Post from '../component/post';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import SuggestionsSidebar from '@/component/suggestionsBar';
import FloatingVoiceButton from '@/component/floatingButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from './../styles/Home.module.css';
import useCurrentUser from '../hooks/useCurrentUser';
import { AnimatePresence, motion } from 'framer-motion';
import RefreshContext from '../context/RefreshContext'; // Import the context

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('recent'); // Default to 'recent'
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1); // Current page
  const [hasMore, setHasMore] = useState(true); // Indicates if more posts are available
  const [isFetching, setIsFetching] = useState(false); // Prevents duplicate fetches
  const [abortController, setAbortController] = useState(null); // For request cancellation

  const { user: currentUser, loading: userLoading } = useCurrentUser(); // Get current user

  // New State Variables for New Posts
  const [newPosts, setNewPosts] = useState([]);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const postsContainerRef = useRef(null);
  const [isUserAtTop, setIsUserAtTop] = useState(true);

  // Debounced filter setter
  const debouncedSetFilter = useCallback(
    debounce((newFilter) => {
      setFilter(newFilter);
      setPage(1);
      setPosts([]);
      setHasMore(true);
    }, 300), // 300ms delay
    []
  );

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      debouncedSetFilter(newFilter);
    }
  };

  // Sorting function based on filter
  const sortPosts = useCallback(
    (postsArray) => {
      if (filter === 'recent') {
        // Sort by timestamp descendingly
        return postsArray.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      } else if (filter.startsWith('topic:')) {
        const topicName = filter.split(':')[1];
        return postsArray.sort((a, b) => {
          const aConfidence = getTopicConfidence(a, topicName);
          const bConfidence = getTopicConfidence(b, topicName);

          if (bConfidence !== aConfidence) {
            return bConfidence - aConfidence; // Higher confidence first
          }
          // If confidence is equal, sort by timestamp descendingly
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
      }
      // Default to timestamp descendingly if filter is unrecognized
      return postsArray.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    },
    [filter]
  );

  // Helper function to get topic confidence
  const getTopicConfidence = (post, topicName) => {
    if (
      post.iab_categories_result &&
      post.iab_categories_result.summary &&
      Array.isArray(post.iab_categories_result.summary)
    ) {
      const categoryObj = post.iab_categories_result.summary.find(
        (cat) =>
          cat.category.split('>').pop().toLowerCase() ===
          topicName.toLowerCase()
      );
      return categoryObj ? categoryObj.confidence : 0;
    }
    return 0;
  };

  // Function to fetch new posts without disrupting existing posts
  const fetchNewPosts = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);

    // Determine the 'since' parameter based on latest post
    const latestTimestamp = posts.length > 0 ? posts[0].timestamp : null;
    try {
      const response = await axios.get('/posts', {
        params: {
          filter,
          page: 1,
          limit: 5, // Fetch latest 5 posts
          since: latestTimestamp, // Assuming backend supports this
        },
      });
      const fetchedPosts = response.data.posts || [];

      // Filter out duplicates
      const existingIds = new Set(posts.map((post) => post._id));
      const uniqueNewPosts = fetchedPosts.filter(
        (post) => !existingIds.has(post._id)
      );

      if (uniqueNewPosts.length > 0) {
        if (isUserAtTop) {
          setPosts((prevPosts) => sortPosts([...uniqueNewPosts, ...prevPosts]));
          // Optionally, you can add a slide-down animation here
        } else {
          setNewPosts(uniqueNewPosts);
          setNewPostsAvailable(true);
        }
      }
    } catch (error) {
      console.error('Error fetching new posts:', error);
    } finally {
      setIsFetching(false);
    }
  }, [filter, isFetching, posts, isUserAtTop, sortPosts]);

  // Define the refresh function to fetch new posts
  const refreshPosts = useCallback(() => {
    fetchNewPosts();
  }, [fetchNewPosts]);

  const fetchHomePosts = useCallback(
    async (currentPage) => {
      if (isFetching) return; // Prevent duplicate fetches
      setIsFetching(true);
      setLoading(true);
      setError('');

      // Cancel previous request if exists
      if (abortController) {
        abortController.abort();
      }

      const controller = new AbortController();
      setAbortController(controller);

      // Set limit based on page
      const limit = currentPage === 1 ? 5 : 20;

      try {
        const response = await axios.get('/posts', {
          params: {
            filter,
            page: currentPage,
            limit,
          },
          signal: controller.signal, // Use AbortController's signal
        });

        let fetchedPosts = response.data.posts || [];

        // Log fetched _id's for debugging
        console.log('Fetched Posts IDs:', fetchedPosts.map((post) => post._id));

        // Sort posts based on filter
        fetchedPosts = sortPosts(fetchedPosts);

        // Remove duplicates before updating state
        setPosts((prevPosts) => {
          if (currentPage === 1) {
            return fetchedPosts;
          } else {
            const existingIds = new Set(prevPosts.map((post) => post._id));
            const newUniquePosts = fetchedPosts.filter(
              (post) => !existingIds.has(post._id)
            );
            return [...prevPosts, ...newUniquePosts];
          }
        });

        // Determine if more posts are available
        const totalPosts = response.data.totalPosts;
        const totalPages = Math.ceil(totalPosts / limit);
        if (currentPage >= totalPages) {
          setHasMore(false);
        }
      } catch (err) {
        if (err.name === 'CanceledError') {
          console.log('Request canceled:', err.message);
        } else if (err.response && err.response.status === 429) {
          console.error('Too many requests:', err);
          setError('You are sending requests too quickly. Please slow down.');
        } else {
          console.error('Error fetching home posts:', err);
          setError(err.response?.data?.error || 'Failed to fetch posts.');
        }
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    },
    [abortController, filter, isFetching, sortPosts]
  );

  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  // Handler to prepend new post
  const handleNewPost = (newPost) => {
    setPosts((prevPosts) => {
      const updatedPosts = [newPost, ...prevPosts];
      // Sort posts based on current filter
      return sortPosts(updatedPosts);
    });
  };

  // Handler to remove a post
  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Implement periodic refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPosts();
    }, 60000); // 60,000ms = 60 seconds

    return () => clearInterval(interval);
  }, [refreshPosts]);

  // Detect if user is at the top of the posts container
  useEffect(() => {
    const handleScroll = () => {
      if (!postsContainerRef.current) return;
      const { scrollTop } = postsContainerRef.current;
      setIsUserAtTop(scrollTop < 100); // Threshold of 100px
    };

    const container = postsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initialize the state
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Initial fetch and fetch on filter or page change
  useEffect(() => {
    fetchHomePosts(page);
  }, [filter, page, fetchHomePosts]);

  return (
    <RefreshContext.Provider value={refreshPosts}>
      <div className={styles.home}>
        <Navbar />
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        {/* <SuggestionsSidebar /> */}
        <div
          className={styles.postsContainer}
          ref={postsContainerRef}
          id="scrollableDiv"
        >
          {/* Notification for New Posts */}
          <AnimatePresence>
            {newPostsAvailable && (
              <motion.div
                className={styles.newPostsNotification}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  setPosts((prevPosts) =>
                    sortPosts([...newPosts, ...prevPosts])
                  );
                  setNewPostsAvailable(false);
                  setNewPosts([]);
                  if (postsContainerRef.current) {
                    postsContainerRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }
                }}
              >
                New posts available. Click to view.
              </motion.div>
            )}
          </AnimatePresence>

          <FloatingVoiceButton onNewPost={handleNewPost} /> {/* Pass the handler */}
          {error && <p className={styles.error}>{error}</p>}
          <InfiniteScroll
            dataLength={posts.length}
            next={fetchMoreData}
            hasMore={hasMore}
            loader={<p className={styles.loadingText}>Loading more posts...</p>}
            endMessage={
              <p className={styles.endMessage}>
                <b>You have seen all the posts.</b>
              </p>
            }
            scrollableTarget="scrollableDiv"
          >
            <AnimatePresence>
              {posts.length === 0 && !loading && !error && (
                <motion.p
                  className={styles.noPosts}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  No posts available.
                </motion.p>
              )}
              {Array.isArray(posts) &&
                posts.map((post) => {
                  if (!post._id) {
                    console.warn('Post missing _id:', post);
                    return null;
                  }
                  return (
                    <Post
                      key={post._id}
                      post={post}
                      currentUserId={currentUser?._id} // Pass currentUserId
                      onDelete={handleDeletePost} // Pass onDelete handler
                    />
                  );
                })}
            </AnimatePresence>
          </InfiniteScroll>
          {loading && posts.length === 0 && (
            <p className={styles.loadingText}>Loading posts...</p>
          )}
        </div>
      </div>
    </RefreshContext.Provider>
  );
};

export default Home;
