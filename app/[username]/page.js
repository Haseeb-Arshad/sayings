// app/[username]/page.jsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../component/navBar';
import Sidebar from '../../component/sidebar';
import Post from '../../component/post';
import FloatingVoiceButton from '../../component/floatingButton';
import InfiniteScroll from 'react-infinite-scroll-component';
import debounce from 'lodash.debounce';
import axios from '../../utils/axiosInstance';
import styles from '../../styles/Profile.module.css';
import useCurrentUser from '../../hooks/useCurrentUser';
import { AnimatePresence, motion } from 'framer-motion';

const UserProfile = () => {
  const { username } = useParams(); // Get the dynamic username from the URL
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('recent');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  // Fetch user details by username
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`/users/username/${username}`);
        console.log("Response:", response);
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

  // Fetch user's posts
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

  // Determine if the profile belongs to the current user
  const isOwnProfile = profileUser && currentUser && profileUser._id === currentUser._id;

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={handleFilterChange} currentFilter={filter} />
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
                {isOwnProfile && (
                  <FloatingVoiceButton onNewPost={handleNewPost} />
                )}
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
                    <AnimatePresence>
                      {posts.map((post) => (
                        <Post
                          key={post._id}
                          post={post}
                          currentUserId={currentUser?._id}
                          onDelete={handleDeletePost}
                        />
                      ))}
                    </AnimatePresence>
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
    </div>
  );
};

export default UserProfile;
