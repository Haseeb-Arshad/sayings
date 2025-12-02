'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/utils/axiosInstance';
import Post from '@/component/post';
import Navbar from '@/component/navBar';
import Sidebar from '@/component/sidebar';
import styles from '@/styles/Explore.module.css';

const PostPage = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSinglePost = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/posts/${postId}`);
        setPost(response.data.post);
      } catch (err) {
        console.error('Error fetching the post:', err);
        setError(err.response?.data?.error || 'Failed to fetch the post.');
      }
      setLoading(false);
    };

    if (postId) {
      fetchSinglePost();
    }
  }, [postId]);

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={() => {}} currentFilter="recent" />
        <div className={styles.exploreSection}>
          {loading && <p className={styles.loadingText}>Loading post...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && post && <Post key={post._id} post={post} />}
        </div>
      </div>
    </div>
  );
};

export default PostPage;
