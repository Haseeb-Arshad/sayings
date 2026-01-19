'use client';

import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import axios from '../../utils/axiosInstance';
import styles from '../../styles/Profile.module.css';
import useCurrentUser from '../../hooks/useCurrentUser';
import SkeletonPost from '../../component/SkeletonPost';

const Post = lazy(() => import('../../component/post'));

const UserProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useCurrentUser();

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('recent');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`/users/username/${username}`);
        setProfileUser(response.data.user);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err.response?.data?.error || 'Failed to fetch user.');
      }
    };

    if (username) {
      fetchUser();
    }
  }, [username]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!profileUser) return;

      setIsFetching(true);
      setIsLoadingPosts(true);
      setError('');

      try {
        const response = await axios.get(`/posts/user/${profileUser._id}`, {
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
      } catch (err) {
        console.error('Error fetching user posts:', err);
        setError(err.response?.data?.error || 'Failed to fetch posts.');
      } finally {
        setIsLoadingPosts(false);
        setIsFetching(false);
      }
    };

    fetchUserPosts();
  }, [profileUser, filter, page]);

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

  return (
    <div className={styles.container}>
      <div className={styles.profileSection}>
        {error && <p className={styles.error}>{error}</p>}

        {profileUser ? (
          <>
            <div className={styles.profileInfo}>
              <img
                src={profileUser.avatar || '/images/profile/dp.webp'}
                alt={`${profileUser.username}'s avatar`}
                className={styles.avatar}
              />
              <h2 className={styles.username}>{profileUser.username}</h2>
              <p className={styles.bio}>{profileUser.bio}</p>
            </div>

            <div className={styles.postsSection}>
              {isLoadingPosts ? (
                <p className={styles.loadingText}>Loading posts...</p>
              ) : posts.length > 0 ? (
                <InfiniteScroll
                  dataLength={posts.length}
                  next={() => setPage((prev) => prev + 1)}
                  hasMore={hasMore}
                  loader={<p className={styles.loadingText}>Loading more posts...</p>}
                  endMessage={
                    <p className={styles.endMessage}>
                      <b>You have seen all the posts.</b>
                    </p>
                  }
                >
                  <Suspense
                    fallback={
                      <>
                        <SkeletonPost />
                        <SkeletonPost />
                      </>
                    }
                  >
                    {posts.map((post) => (
                      <Post
                        key={post._id}
                        post={post}
                        currentUserId={currentUser?._id}
                        onDelete={handleDeletePost}
                      />
                    ))}
                  </Suspense>
                </InfiniteScroll>
              ) : (
                <p className={styles.noPosts}>No posts available.</p>
              )}
            </div>
          </>
        ) : (
          !isLoadingPosts && <p className={styles.noPosts}>User not found.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
