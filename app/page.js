'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import axios, { isNetworkOffline } from '../utils/axiosInstance';
import Post from '../component/post';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
// import SuggestionsSidebar from '../component/SuggestionsBar';
import FloatingVoiceButton from '../component/floatingButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from '../styles/Home.module.css';
import useCurrentUser from '../hooks/useCurrentUser';
import { AnimatePresence, motion } from 'framer-motion';
import RefreshContext from '../context/RefreshContext';

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
    }, 300),
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
        return postsArray.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      } else if (filter.startsWith('topic:')) {
        const topicName = filter.split(':')[1];
        return postsArray.sort((a, b) => {
          const aConfidence = getTopicConfidence(a, topicName);
          const bConfidence = getTopicConfidence(b, topicName);

          if (bConfidence !== aConfidence) {
            return bConfidence - aConfidence;
          }
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
      }
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
    if (isFetching || isNetworkOffline()) return;
    setIsFetching(true);

    const latestTimestamp = posts.length > 0 ? posts[0].timestamp : null;
    try {
      const response = await axios.get('/posts', {
        params: {
          filter,
          page: 1,
          limit: 5,
          since: latestTimestamp,
        },
      });

      const fetchedPosts = response.data.posts || [];

      const existingIds = new Set(posts.map((post) => post._id));
      const uniqueNewPosts = fetchedPosts.filter(
        (post) => !existingIds.has(post._id)
      );

      if (uniqueNewPosts.length > 0) {
        if (isUserAtTop) {
          setPosts((prevPosts) => sortPosts([...uniqueNewPosts, ...prevPosts]));
        } else {
          setNewPosts(uniqueNewPosts);
          setNewPostsAvailable(true);
        }
      }
    } catch (error) {
      // Only show errors when they're not related to being offline
      if (!error.isOffline) {
        console.error('Error fetching new posts:', error);
      }
      // We don't set the error state for background fetches to avoid disrupting the UI
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
      // Don't fetch if already fetching or offline on initial load (page 1)
      if (isFetching || (currentPage === 1 && isNetworkOffline())) {
        if (currentPage === 1 && isNetworkOffline()) {
          setError('You are currently offline. Please check your connection to view posts.');
          setLoading(false);
        }
        return;
      }
      
      setIsFetching(true);
      setLoading(true);
      setError('');

      if (abortController) {
        abortController.abort();
      }

      const controller = new AbortController();
      setAbortController(controller);

      const limit = 5; // Always load 5 posts per page

      try {
        const response = await axios.get('/posts', {
          params: {
            filter,
            page: currentPage,
            limit,
          },
          signal: controller.signal,
        });

        let fetchedPosts = response.data.posts || [];

        fetchedPosts = sortPosts(fetchedPosts);

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

        const totalPosts = response.data.totalPosts;
        const totalPages = Math.ceil(totalPosts / limit);
        if (currentPage >= totalPages) {
          setHasMore(false);
        }
        
        // Clear any previous errors on successful fetch
        setError('');
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          console.log('Request canceled:', err.message);
        } else if (err.response && err.response.status === 429) {
          console.error('Too many requests:', err);
          setError('You are sending requests too quickly. Please slow down.');
        } else if (err.isOffline) {
          console.log('Offline error when fetching posts');
          setError('You appear to be offline. Connect to the internet to view new posts.');
          // If we have existing posts, don't clear them - just show the offline message
          if (currentPage === 1 && posts.length === 0) {
            // Only set loading to false if we're on the first page and have no posts
            setLoading(false);
          }
        } else {
          console.error('Error fetching home posts:', err);
          setError(
            err.response?.data?.error ||
            err.message ||
            'Failed to fetch posts. Please try again later.'
          );
        }
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    },
    [abortController, filter, isFetching, sortPosts, posts.length]
  );

  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  // Handler to prepend new post
  const handleNewPost = (newPost) => {
    setPosts((prevPosts) => {
      const updatedPosts = [newPost, ...prevPosts];
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
  }, [abortController]);

  // Implement periodic refresh every 60 seconds, but only when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isNetworkOffline()) {
        refreshPosts();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshPosts]);

  // Detect if user is at the top of the posts container
  useEffect(() => {
    const handleScroll = () => {
      if (!postsContainerRef.current) return;
      const { scrollTop } = postsContainerRef.current;
      setIsUserAtTop(scrollTop < 100);
    };

    const container = postsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
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
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        {/* <SuggestionsSidebar /> */}
        <div
          className={styles.postsContainer}
          ref={postsContainerRef}
          id="scrollableDiv"
        >
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

          <FloatingVoiceButton onNewPost={handleNewPost} />
          {error && (
            <motion.div 
              className={styles.error}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.errorIcon}>
                {error.includes('offline') ? '📶' : '⚠️'}
              </div>
              <p>{error}</p>
              {error.includes('offline') && (
                <motion.button 
                  className={styles.retryButton}
                  onClick={() => fetchHomePosts(1)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Retry
                </motion.button>
              )}
            </motion.div>
          )}
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
                      currentUserId={currentUser?._id}
                      onDelete={handleDeletePost}
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
