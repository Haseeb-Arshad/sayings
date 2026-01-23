'use client';

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from '../styles/Profile.module.css';
import axios from '../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import useCurrentUser from '../hooks/useCurrentUser';
import SkeletonPost from './SkeletonPost';

const Post = lazy(() => import('../component/post'));

const Profile = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('recent');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;

      setIsFetching(true);
      setIsLoadingPosts(true);
      setError('');

      try {
        const response = await axios.get(`/posts/user/${user._id}`, {
          params: { filter, page, limit: 10 },
        });

        const fetchedPosts = response.data.posts || [];

        setPosts((prevPosts) => {
          if (page === 1) {
            return fetchedPosts;
          }
          const existingIds = new Set(prevPosts.map((p) => p._id));
          const newUniquePosts = fetchedPosts.filter((p) => !existingIds.has(p._id));
          return [...prevPosts, ...newUniquePosts];
        });

        const totalPosts = response.data.totalPosts || fetchedPosts.length;
        const totalPages = Math.ceil(totalPosts / 10);
        if (page >= totalPages) {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching user posts:', error);
        setError(error.response?.data?.error || 'Failed to fetch posts.');
      } finally {
        setIsLoadingPosts(false);
        setIsFetching(false);
      }
    };

    fetchUserPosts();
  }, [user, filter, page]);

  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

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

  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const calculateTotalLikes = () => {
    return posts.reduce((acc, post) => acc + (post.likes || 0), 0);
  };

  const getPersonalityDescriptors = (traits) => {
    const descriptors = [];
    const highThreshold = 0.6;
    const lowThreshold = 0.4;

    if (traits.Openness >= highThreshold) descriptors.push('Open-minded');
    else if (traits.Openness < lowThreshold) descriptors.push('Conventional');
    else descriptors.push('Practical');

    if (traits.Conscientiousness >= highThreshold) descriptors.push('Organized');
    else if (traits.Conscientiousness < lowThreshold) descriptors.push('Spontaneous');
    else descriptors.push('Flexible');

    if (traits.Extraversion >= highThreshold) descriptors.push('Outgoing');
    else if (traits.Extraversion < lowThreshold) descriptors.push('Introverted');
    else descriptors.push('Reserved');

    if (traits.Agreeableness >= highThreshold) descriptors.push('Friendly');
    else if (traits.Agreeableness < lowThreshold) descriptors.push('Critical');
    else descriptors.push('Neutral');

    if (traits.Neuroticism >= highThreshold) descriptors.push('Sensitive');
    else if (traits.Neuroticism < lowThreshold) descriptors.push('Calm');
    else descriptors.push('Stable');

    return descriptors;
  };

  const personalityDescriptors = useMemo(() => {
    return user?.personality ? getPersonalityDescriptors(user.personality) : [];
  }, [user]);

  return (
    <div className={styles.container}>
      <div id="scrollableProfileDiv" className={styles.profileSection}>
        {error && <p className={styles.error}>{error}</p>}

        {user ? (
          <>
            <div className={styles.profileInfo}>
              <img
                src={user.avatar || '/images/profile/dp.webp'}
                alt="User Avatar"
                className={styles.avatar}
              />
              <div className={styles.userDetails}>
                <h2 className={styles.username}>{user.username}</h2>
                <p className={styles.bio}>{user.bio}</p>

                <div className={styles.userStats}>
                  <div className={styles.statItem}>
                    <div>
                      <span className={styles.statNumber}>{posts.length}</span>
                      <span className={styles.statLabel}>Posts</span>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div>
                      <span className={styles.statNumber}>{calculateTotalLikes()}</span>
                      <span className={styles.statLabel}>Total Likes</span>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div>
                      <span className={styles.statNumber}>{formatDate(user.createdAt)}</span>
                      <span className={styles.statLabel}>Joined</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.personalityAndReview}>
              <div className={styles.personalitySection}>
                <div className={styles.sectionTitle}>Personality Traits</div>
                <div className={styles.personalityDescriptors}>
                  {personalityDescriptors.map((descriptor, index) => (
                    <span key={index} className={styles.descriptorBadge}>
                      {descriptor}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.profileReviewSection}>
                <div className={styles.sectionTitle}>Profile Review</div>
                <p className={styles.profileReviewText}>
                  {user.profileReview || 'No review available.'}
                </p>
              </div>
            </div>

            <div className={styles.postsSection}>
              <div className={styles.profileHeader}>
                <h2>Your Sayings</h2>
                <div className={styles.filterOptions}>
                  <button
                    className={`${styles.filterButton} ${filter === 'recent' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('recent')}
                    type="button"
                  >
                    Recent
                  </button>
                  <button
                    className={`${styles.filterButton} ${filter === 'top' ? styles.active : ''}`}
                    onClick={() => handleFilterChange('top')}
                    type="button"
                  >
                    Top
                  </button>
                </div>
              </div>

              {isLoadingPosts && page === 1 ? (
                <p className={styles.loadingText}>Loading posts...</p>
              ) : (
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
                  scrollableTarget="scrollableProfileDiv"
                >
                  <Suspense
                    fallback={
                      <>
                        <SkeletonPost />
                        <SkeletonPost />
                      </>
                    }
                  >
                    {posts.length > 0 ? (
                      posts.map((post) => (
                        <div key={post._id} className={styles.postCard}>
                          <Post
                            post={post}
                            currentUserId={user._id}
                            onDelete={handleDeletePost}
                          />
                        </div>
                      ))
                    ) : (
                      !isLoadingPosts && <p className={styles.noPosts}>No posts available.</p>
                    )}
                  </Suspense>
                </InfiniteScroll>
              )}
            </div>
          </>
        ) : (
          !isLoadingPosts && <p className={styles.noPosts}>User not found.</p>
        )}
      </div>
    </div>
    </div >
  );
};

export default Profile;
