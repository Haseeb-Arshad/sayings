'use client';

import { Suspense, lazy, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios, { isNetworkOffline } from '../utils/axiosInstance';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from '../styles/Home.module.css';
import useCurrentUser from '../hooks/useCurrentUser';
import useRealtimeFeed from '../hooks/useRealtimeFeed';
import { AnimatePresence, motion } from 'framer-motion';
import RefreshContext from '../context/RefreshContext';
import useInfinitePosts from '../hooks/useInfinitePosts';
import useScrollPrefetch, { useScrollPersistence } from '../hooks/useScrollPrefetch';
import SkeletonPost from '../component/SkeletonPost';

const Post = lazy(() => import('../component/post'));

const Home = () => {
  const [filter, setFilter] = useState('recent'); // Default to 'recent'
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [newPosts, setNewPosts] = useState([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [isUserAtTop, setIsUserAtTop] = useState(true);
  const postsContainerRef = useRef(null);

  const { user: currentUser } = useCurrentUser();

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
  const { isFetching: isPrefetching } = useScrollPrefetch(
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
      setNewPostsCount(0);
    }, 300),
    []
  );

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      debouncedSetFilter(newFilter);
    }
  };

  // Callback when new posts are detected via real-time updates
  const handleNewPosts = useCallback((uniqueNewPosts) => {
    if (uniqueNewPosts.length > 0) {
      if (isUserAtTop) {
        // User is at top, refetch to get new posts immediately
        refetch();
        setNewPostsCount(0);
        setNewPostsAvailable(false);
      } else {
        // User is scrolled down, show badge
        setNewPosts((prevNewPosts) => {
          const allNew = [...uniqueNewPosts, ...prevNewPosts];
          const uniqueIds = new Set();
          const deduped = allNew.filter(post => {
            if (uniqueIds.has(post._id)) return false;
            uniqueIds.add(post._id);
            return true;
          });
          setNewPostsCount(deduped.length);
          return deduped;
        });
        setNewPostsAvailable(true);
      }
    }
  }, [isUserAtTop, refetch]);

  // Callback when a post is updated (like, comment, etc.)
  const handlePostUpdate = useCallback((updatedPost) => {
    // This will be handled by React Query's cache eventually
    refetch();
  }, [refetch]);

  // Use real-time feed hook
  const { isConnected, connectionType } = useRealtimeFeed({
    posts: allPosts,
    onNewPosts: handleNewPosts,
    onPostUpdate: handlePostUpdate,
    filter,
    enabled: status === 'success' && allPosts.length > 0,
  });

  // Manual refresh function
  const refreshPosts = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle scroll and persistence
  useEffect(() => {
    const handleScroll = () => {
      if (!postsContainerRef.current) return;
      const { scrollTop } = postsContainerRef.current;
      const nowAtTop = scrollTop < 100;

      setIsUserAtTop(nowAtTop);

      // If user scrolled to top and there are new posts available, auto-load them
      if (nowAtTop && newPostsAvailable) {
        refetch();
        setNewPostsAvailable(false);
        setNewPosts([]);
        setNewPostsCount(0);
      }

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
  }, [newPostsAvailable, refetch, saveScrollPosition, restoreScrollPosition]);

  // Handler to remove a post
  const handleDeletePost = (postId) => {
    refetch();
  };

  // Loading and error states
  if (status === 'loading') {
    return (
      <div className={styles.home}>
        <div className={styles.postsContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.skeletonLoader}>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonPost key={i} />
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
                  setNewPostsCount(0);
                  if (postsContainerRef.current) {
                    postsContainerRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }
                }}
              >
                {newPostsCount > 0
                  ? `${newPostsCount} new post${newPostsCount > 1 ? 's' : ''} available. Click to view.`
                  : 'New posts available. Click to view.'
                }
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connection Status Indicator */}
          {isConnected && (
            <motion.div
              className={styles.connectionStatus}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              title={`Connection active`}
            >
              <span className={styles.connectionDot}></span>
              <span className={styles.connectionText}>Live</span>
            </motion.div>
          )}

          <InfiniteScroll
            dataLength={allPosts.length}
            next={fetchNextPage}
            hasMore={hasNextPage}
            loader={
              <div className={styles.loadingContainer}>
                {(isFetchingNextPage || isPrefetching) && (
                  <div className={styles.skeletonLoader}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonPost key={i} />
                    ))}
                  </div>
                )}
                {!isFetchingNextPage && !isPrefetching && hasNextPage && (
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
          >
            <Suspense fallback={<SkeletonPost />}>
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
                  if (!post._id) return null;
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
            </Suspense>
          </InfiniteScroll>

          {/* Manual Load More button as fallback */}
          {hasNextPage && !isFetchingNextPage && (
            <div className={styles.loadMoreContainer}>
              <motion.button
                className={styles.loadMoreButton}
                onClick={() => fetchNextPage()}
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
