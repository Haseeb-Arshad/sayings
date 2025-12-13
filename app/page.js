'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios, { isNetworkOffline } from '../utils/axiosInstance';
import Post from '../component/post';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import ProfileSidebar from '../component/ProfileSidebar';
import SuggestionsSidebar from '../component/suggestionsBar';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from '../styles/Home.module.css';
import useCurrentUser from '../hooks/useCurrentUser';
import { AnimatePresence, motion } from 'framer-motion';
import RefreshContext from '../context/RefreshContext';
import useInfinitePosts, { encodeCursor } from '../hooks/useInfinitePosts';
import useScrollPrefetch, { useScrollPersistence } from '../hooks/useScrollPrefetch';

const Home = () => {
  const [filter, setFilter] = useState('recent'); // Default to 'recent'
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [newPosts, setNewPosts] = useState([]);
  const [isUserAtTop, setIsUserAtTop] = useState(true);
  const postsContainerRef = useRef(null);

  const { user: currentUser, loading: userLoading } = useCurrentUser();

  // Use our infinite query hook
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfinitePosts(filter, 20);

  // Get all posts from all pages (memoized to avoid recalculation)
  const allPosts = useMemo(() => {
    return data?.pages?.flatMap(page => page.posts) || [];
  }, [data?.pages]);

  // Scroll detection and prefetch
  const { scrollProgress, isFetching: isPrefetching } = useScrollPrefetch(
    filter,
    data?.pages?.[data.pages.length - 1]?.nextCursor,
    hasNextPage
  );

  // Scroll position persistence
  const { saveScrollPosition, restoreScrollPosition } = useScrollPersistence('home-scroll');

  // Debounced filter setter
  const debouncedSetFilter = useCallback(
    debounce((newFilter) => {
      setFilter(newFilter);
      setNewPostsAvailable(false);
      setNewPosts([]);
    }, 300),
    [] // Dependencies are intentionally empty as we want stable reference
  );

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      debouncedSetFilter(newFilter);
    }
  };

  // Detect if user is at the top of the posts container
  useEffect(() => {
    const handleScroll = () => {
      if (!postsContainerRef.current) return;
      const { scrollTop } = postsContainerRef.current;
      setIsUserAtTop(scrollTop < 100);
      
      // Save scroll position
      saveScrollPosition({ top: scrollTop, timestamp: Date.now() });
    };

    const container = postsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      
      // Restore scroll position on mount
      setTimeout(() => restoreScrollPosition(postsContainerRef), 100);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [filter, saveScrollPosition, restoreScrollPosition]);

  // Handler to remove a post
  const handleDeletePost = (postId) => {
    // This will be handled by React Query's cache invalidation
    refetch();
  };

  // Function to handle loading more posts
  const loadMorePosts = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Function to fetch new posts (simplified version)
  const fetchNewPosts = useCallback(() => {
    if (isNetworkOffline()) return;
    
    return axios.get('/posts', {
      params: {
        filter,
        limit: 5,
      },
    }).then(response => {
      const fetchedPosts = response.data.posts || [];
      const existingIds = new Set(allPosts.map((post) => post._id));
      const uniqueNewPosts = fetchedPosts.filter(
        (post) => !existingIds.has(post._id)
      );

      if (uniqueNewPosts.length > 0) {
        if (isUserAtTop) {
          refetch();
        } else {
          setNewPosts(uniqueNewPosts);
          setNewPostsAvailable(true);
        }
      }
    }).catch(error => {
      console.error('Error fetching new posts:', error);
    });
  }, [filter, allPosts, isUserAtTop, refetch]);

  // Implement periodic refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isNetworkOffline()) {
        fetchNewPosts();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNewPosts]);

  // Manual refresh function
  const refreshPosts = useCallback(() => {
    fetchNewPosts();
  }, [fetchNewPosts]);

  // Loading and error states
  if (status === 'loading') {
    return (
      <div className={styles.home}>
        <Navbar />
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        <ProfileSidebar />
        <SuggestionsSidebar />
        <div className={styles.postsContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.skeletonLoader}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.skeletonPost}>
                  <div className={styles.skeletonAvatar}></div>
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonLine}></div>
                    <div className={styles.skeletonLine}></div>
                    <div className={styles.skeletonLine}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <RefreshContext.Provider value={refreshPosts}>
        <div className={styles.home}>
          <Navbar />
          <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
          <ProfileSidebar />
          <SuggestionsSidebar />
          <div className={styles.postsContainer}>
            <motion.div
              className={styles.error}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.errorIcon}>⚠️</div>
              <p>Failed to load posts. Please try again.</p>
              <motion.button
                className={styles.retryButton}
                onClick={() => refetch()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Retry
              </motion.button>
            </motion.div>
          </div>
        </div>
      </RefreshContext.Provider>
    );
  }

  return (
    <RefreshContext.Provider value={refreshPosts}>
      <div className={styles.home}>
        <Navbar />
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        <ProfileSidebar />
        <SuggestionsSidebar />
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
                  refetch();
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

          <InfiniteScroll
            dataLength={allPosts.length}
            next={loadMorePosts}
            hasMore={hasNextPage}
            loader={
              <div className={styles.loadingContainer}>
                {(isFetchingNextPage || isPrefetching) && (
                  <div className={styles.skeletonLoader}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.skeletonPost}>
                        <div className={styles.skeletonAvatar}></div>
                        <div className={styles.skeletonContent}>
                          <div className={styles.skeletonLine}></div>
                          <div className={styles.skeletonLine}></div>
                          <div className={styles.skeletonLine}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!isFetchingNextPage && !isPrefetching && (
                  <p className={styles.loadingText}>Loading more posts...</p>
                )}
              </div>
            }
            endMessage={
              <p className={styles.endMessage}>
                <b>You have seen all the posts.</b>
              </p>
            }
            scrollableTarget="scrollableDiv"
            // Add load more button fallback at 50% scroll
            onScroll={(scrollTop) => {
              const container = postsContainerRef.current;
              if (container) {
                const { scrollHeight, clientHeight } = container;
                const progress = (scrollTop + clientHeight) / scrollHeight;
                
                // If we've scrolled 50% and haven't fetched yet, trigger fetch
                if (progress >= 0.5 && hasNextPage && !isFetchingNextPage) {
                  loadMorePosts();
                }
              }
            }}
          >
            <AnimatePresence>
              {allPosts.length === 0 && (
                <motion.p
                  className={styles.noPosts}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  No posts available.
                </motion.p>
              )}
              {allPosts.map((post) => {
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

          {/* Manual Load More button as fallback */}
          {hasNextPage && !isFetchingNextPage && (
            <div className={styles.loadMoreContainer}>
              <motion.button
                className={styles.loadMoreButton}
                onClick={loadMorePosts}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Load More Posts
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </RefreshContext.Provider>
  );
};

export default Home;
