// app/store/postsSlice.js
import { createSlice } from '@reduxjs/toolkit';

// Define the initial state without TypeScript interfaces
const initialState = {
  posts: [],
  loading: false,
  error: null,
};

// Create the posts slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    fetchPostsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPostsSuccess(state, action) {
      state.loading = false;
      state.posts = action.payload;
    },
    fetchPostsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    addNewPost(state, action) {
      state.posts.unshift(action.payload);
    },
    // Add more reducers like updatePost, deletePost, etc.
  },
});

// Export the action creators
export const { fetchPostsStart, fetchPostsSuccess, fetchPostsFailure, addNewPost } = postsSlice.actions;

// Export the reducer to be included in the store
export default postsSlice.reducer;
