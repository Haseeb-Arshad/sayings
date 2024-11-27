// app/profile/page.jsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import Post from '../component/post';
import FloatingVoiceButton from '../component/floatingButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import styles from '../styles/Profile.module.css';
import axios from '../utils/axiosInstance';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import useCurrentUser from '../hooks/useCurrentUser';

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
      // If not loading and user is null, redirect to login
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
        console.log('Response:', response);

        const fetchedPosts = response.data.posts || [];

        setPosts((prevPosts) => {
          if (page === 1) {
            return fetchedPosts;
          } else {
            const existingIds = new Set(prevPosts.map((post) => post._id));
            const newUniquePosts = fetchedPosts.filter(
              (post) => !existingIds.has(post._id)
            );
            return [...prevPosts, ...newUniquePosts];
          }
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

  // Handler to delete a post
  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  // Handler to prepend new post
  const handleNewPost = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  // Handle filter changes with debounce
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

  // Fetch more data for infinite scroll
  const fetchMoreData = () => {
    if (!hasMore || isFetching) return;
    setPage((prevPage) => prevPage + 1);
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate total likes
  const calculateTotalLikes = () => {
    return posts.reduce((acc, post) => acc + (post.likes || 0), 0);
  };

  // Function to map personality traits to descriptors
  const getPersonalityDescriptors = (traits) => {
    const descriptors = [];

    // Define thresholds
    const highThreshold = 0.6;
    const lowThreshold = 0.4;

    // Openness
    if (traits.Openness >= highThreshold) descriptors.push('Open-minded');
    else if (traits.Openness < lowThreshold) descriptors.push('Conventional');
    else descriptors.push('Practical');

    // Conscientiousness
    if (traits.Conscientiousness >= highThreshold) descriptors.push('Organized');
    else if (traits.Conscientiousness < lowThreshold) descriptors.push('Spontaneous');
    else descriptors.push('Flexible');

    // Extraversion
    if (traits.Extraversion >= highThreshold) descriptors.push('Outgoing');
    else if (traits.Extraversion < lowThreshold) descriptors.push('Introverted');
    else descriptors.push('Reserved');

    // Agreeableness
    if (traits.Agreeableness >= highThreshold) descriptors.push('Friendly');
    else if (traits.Agreeableness < lowThreshold) descriptors.push('Critical');
    else descriptors.push('Neutral');

    // Neuroticism
    if (traits.Neuroticism >= highThreshold) descriptors.push('Sensitive');
    else if (traits.Neuroticism < lowThreshold) descriptors.push('Calm');
    else descriptors.push('Stable');

    return descriptors;
  };

  // Get personality descriptors
  const personalityDescriptors = user ? getPersonalityDescriptors(user.personality) : [];

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
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
                        <span className={styles.statNumber}>
                          {formatDate(user.createdAt)}
                        </span>
                        <span className={styles.statLabel}>Joined</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personality Traits and Profile Review Sections */}
              <div className={styles.personalityAndReview}>
                {/* Personality Traits Section */}
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

                {/* Profile Review Section */}
                <div className={styles.profileReviewSection}>
                  <div className={styles.sectionTitle}>Profile Review</div>
                  <p className={styles.profileReviewText}>
                    {user.profileReview || 'No review available.'}
                  </p>
                </div>
              </div>

              {/* Posts Section */}
              <div className={styles.postsSection}>
                <FloatingVoiceButton onNewPost={handleNewPost} />
                <div className={styles.profileHeader}>
                  <h2 style={{ marginLeft: '1.5rem' }}>Your Sayings</h2>
                  <div className={styles.filterOptions}>
                    <button
                      className={`${styles.filterButton} ${
                        filter === 'recent' ? styles.active : ''
                      }`}
                      onClick={() => handleFilterChange('recent')}
                    >
                      Recent
                    </button>
                    <button
                      className={`${styles.filterButton} ${
                        filter === 'top' ? styles.active : ''
                      }`}
                      onClick={() => handleFilterChange('top')}
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
                    <AnimatePresence>
                      {posts.length > 0 ? (
                        posts.map((post) => (
                          <motion.div
                            key={post._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className={styles.postCard}
                          >
                            <Post
                              post={post}
                              currentUserId={user._id}
                              onDelete={handleDeletePost}
                            />
                          </motion.div>
                        ))
                      ) : (
                        !isLoadingPosts && (
                          <motion.p
                            className={styles.noPosts}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            No posts available.
                          </motion.p>
                        )
                      )}
                    </AnimatePresence>
                  </InfiniteScroll>
                )}
              </div>
            </>
          ) : (
            !isLoadingPosts && <p className={styles.noPosts}>User not found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
