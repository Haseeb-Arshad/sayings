// app/profile/page.jsx

'use client';

import { useState, useEffect } from 'react';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import Post from '../component/post';
import FloatingVoiceButton from '../component/floatingButton';
import styles from '../styles/Profile.module.css';
import axios from '../utils/axiosInstance';
import useCurrentUser from '../hooks/useCurrentUser';
import { useRouter } from 'next/navigation';

const Profile = () => {
  const { user, loading } = useCurrentUser();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('recent');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // If not loading and user is null, redirect to login
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;
      setIsLoadingPosts(true);
      try {
        const response = await axios.get(`/posts/user/${user.id}`, {
          params: { filter },
        });
        setPosts(response.data.posts);
      } catch (error) {
        console.error('Error fetching user posts:', error);
      }
      setIsLoadingPosts(false);
    };

    fetchUserPosts();
  }, [user, filter]);

  const handleNewPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={setFilter} />
        <div className={styles.profileSection}>
          {user && (
            <div className={styles.profileInfo}>
              <img src={user.avatar || '/images/profile/dp.webp'} alt="User Avatar" className={styles.avatar} />
              <h2 className={styles.username}>{user.username}</h2>
              <p className={styles.bio}>{user.bio}</p>
            </div>
          )}
          <div className={styles.postsSection}>
            <FloatingVoiceButton onNewPost={handleNewPost} />
            {isLoadingPosts ? (
              <p className={styles.loadingText}>Loading posts...</p>
            ) : posts.length > 0 ? (
              posts.map((post) => <Post key={post._id} post={post} />)
            ) : (
              <p className={styles.noPosts}>No posts available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
