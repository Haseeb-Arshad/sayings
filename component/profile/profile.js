// pages/profile.js

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Post from '../components/Post';
import FloatingVoiceButton from '../components/FloatingVoiceButton';
import styles from '../styles/Profile.module.css';
import axios from 'axios';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('recent');
  const [loading, setLoading] = useState(false);

  // Fetch user data (assuming authentication is implemented)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token'); // Adjust based on auth implementation
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUser();
  }, []);

  // Fetch user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/posts/user/${user._id}`, {
          params: { filter },
        });
        setPosts(response.data.posts);
      } catch (error) {
        console.error('Error fetching user posts:', error);
      }
      setLoading(false);
    };

    fetchUserPosts();
  }, [user, filter]);

  const handleNewPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={setFilter} />
        <div className={styles.profileSection}>
          {user && (
            <div className={styles.profileInfo}>
              <img src={user.avatar || '/default-avatar.png'} alt="User Avatar" className={styles.avatar} />
              <h2 className={styles.username}>{user.username}</h2>
              <p className={styles.bio}>{user.bio}</p>
            </div>
          )}
          <div className={styles.postsSection}>
            <FloatingVoiceButton />
            {loading ? (
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
