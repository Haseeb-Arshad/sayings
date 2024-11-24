// app/home/page.jsx

'use client';

import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import Post from '../component/post';
import Navbar from '../component/navBar';
import Sidebar from '../component/sidebar';
import styles from './../styles/Home.module.css';
import SuggestionsSidebar from '@/component/suggestionsBar';
import FloatingVoiceButton from '@/component/floatingButton';



// app/home/page.jsx

// 'use client';

// import { useEffect, useState } from 'react';
// import axios from '../../utils/axiosInstance';
// import Post from '../../components/Post';
// import Navbar from '../../components/Navbar';
// import Sidebar from '../../components/Sidebar';
// import SuggestionsSidebar from '../../components/SuggestionsSidebar';
// import FloatingVoiceButton from '../../components/FloatingVoiceButton';
// import styles from './page.module.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomePosts = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/posts', {
          params: { filter },
        });
        setPosts(response.data.posts || []);
      } catch (err) {
        console.error('Error fetching home posts:', err);
        setError(err.response?.data?.error || 'Failed to fetch posts.');
      }
      setLoading(false);
    };

    fetchHomePosts();
  }, [filter]);

  return (
    <div className={styles.home}>
      <Navbar />
      <div className={styles.mainContent}>
        <Sidebar setFilter={setFilter} />
        <div className={styles.postsSection}>
          <FloatingVoiceButton />
          {loading && <p className={styles.loadingText}>Loading posts...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && posts.length === 0 && !error && (
            <p className={styles.noPosts}>No posts available.</p>
          )}
          {Array.isArray(posts) &&
            posts.map((post) => <Post key={post._id} post={post} />)}
        </div>
        <SuggestionsSidebar />
      </div>
    </div>
  );
};

export default Home;
