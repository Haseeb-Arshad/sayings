'use client';

import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from './../styles/Explore.module.css';
import axios from '../utils/axiosInstance';
import useCurrentUser from '../hooks/useCurrentUser';
import SkeletonPost from './SkeletonPost';

const Navbar = lazy(() => import('../component/navBar'));
const Sidebar = lazy(() => import('../component/sidebar'));
const Post = lazy(() => import('../component/post'));

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('trending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const { user: currentUser } = useCurrentUser();

  const sortPostsDescending = useCallback((postsArray) => {
    return postsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, []);

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
    debouncedSetFilter(newFilter);
  };

  const fetchExplorePosts = async (currentPage) => {
    if (isFetching) return;
    setIsFetching(true);
    setLoading(true);

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
        silent: true,
      });

      let fetchedPosts = response.data.posts || [];
      fetchedPosts = sortPostsDescending(fetchedPosts);

      setPosts((prevPosts) => {
        if (currentPage === 1) {
          return fetchedPosts;
        }

        const existingIds = new Set(prevPosts.map((p) => p._id));
        const newUniquePosts = fetchedPosts.filter((p) => !existingIds.has(p._id));
        return [...prevPosts, ...newUniquePosts];
      });

      const totalPosts = response.data.totalPosts;
      const totalPages = Math.ceil(totalPosts / 20);
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

  useEffect(() => {
    fetchExplorePosts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

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
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div className={styles.mainContent}>
        <Suspense fallback={null}>
          <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
        </Suspense>

        <div id="scrollableExploreDiv" className={styles.exploreSection}>
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
            <Suspense
              fallback={
                <>
                  <SkeletonPost />
                  <SkeletonPost />
                </>
              }
            >
              {posts.length === 0 && !loading && !error && (
                <p className={styles.noPosts}>No posts available.</p>
              )}
              {Array.isArray(posts) &&
                posts.map((post) => {
                  if (!post._id) {
                    console.warn('Explore Post missing _id:', post);
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
            </Suspense>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default Explore;
