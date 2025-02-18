// app/explore/page.jsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import Post from '../component/post';
import FloatingVoiceButton from '@/component/floatingButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from './../styles/Explore.module.css';
import axios from '../utils/axiosInstance';
import { AnimatePresence, motion } from 'framer-motion'; // Import framer-motion
import useCurrentUser from '../hooks/useCurrentUser'; // Ensure to import useCurrentUser

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('trending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1); // Current page
  const [hasMore, setHasMore] = useState(true); // Indicates if more posts are available
  const [isFetching, setIsFetching] = useState(false); // Prevents duplicate fetches
  const [abortController, setAbortController] = useState(null); // For request cancellation

  const { user: currentUser, loading: userLoading } = useCurrentUser(); // Get current user

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
    debouncedSetFilter(newFilter);
  };

  useEffect(() => {
    fetchExplorePosts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const sortPostsDescending = useCallback((postsArray) => {
    return postsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, []);

  const fetchExplorePosts = async (currentPage) => {
    if (isFetching) return; // Prevent duplicate fetches
    setIsFetching(true);
    setLoading(true);

    // Cancel previous request if exists
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await axios.get('/posts', {
        params: {
          filter,
          page: currentPage,
          limit: 20,
        },
        signal: controller.signal,
        silent: true, // This will prevent the interceptor from logging errors for these requests.
      });

      let fetchedPosts = response.data.posts || [];

      // Sort posts descendingly by timestamp
      fetchedPosts = sortPostsDescending(fetchedPosts);

      // Log fetched _id's for debugging
      // console.log(
      //   'Fetched Explore Posts IDs:',
      //   fetchedPosts.map((post) => post._id)
      // );

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
      const totalPages = Math.ceil(totalPosts / 20); // Update based on new limit
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
        console.error('Error fetching explore posts:', err);
        setError(err.response?.data?.error || 'Failed to fetch posts.');
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  // Handler to prepend new post
  const handleNewPost = (newPost) => {
    setPosts((prevPosts) => {
      const updatedPosts = [newPost, ...prevPosts];
      // Sort posts descendingly by timestamp
      return sortPostsDescending(updatedPosts);
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

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        <div id="scrollableExploreDiv" className={styles.exploreSection}>
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
            scrollableTarget="scrollableExploreDiv"
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
                    console.warn('Explore Post missing _id:', post);
                    return null; // Or assign a temporary unique key
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
        </div>
      </div>
    </div>
  );
};

export default Explore;
