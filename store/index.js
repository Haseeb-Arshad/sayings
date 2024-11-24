// app/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import postsReducer from './postsSlice';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    user: userReducer,
  },
});

// Although TypeScript types are removed, you can still access state and dispatch types via JSDoc if needed.
/**
 * @typedef {ReturnType<typeof store.getState>} RootState
 */

/**
 * @typedef {typeof store.dispatch} AppDispatch
 */
