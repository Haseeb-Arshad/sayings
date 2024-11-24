// app/explore/page.jsx

'use client';

import { useState, useEffect } from 'react';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import Post from '../component/post';
import FloatingVoiceButton from '../component/floatingButton';
import styles from './../styles/Explore.module.css';
import axios from '../utils/axiosInstance';

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('trending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExplorePosts = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/posts', {
          params: { filter },
        });
        setPosts(response.data.posts);
      } catch (error) {
        console.error('Error fetching explore posts:', error);
      }
      setLoading(false);
    };

    fetchExplorePosts();
  }, [filter]);

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={setFilter} />
        <div className={styles.exploreSection}>
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
  );
};

export default Explore;
