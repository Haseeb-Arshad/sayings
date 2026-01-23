'use client';

import { useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Register.module.css';
import Link from 'next/link';
import Image from 'next/image';

const validateAll = (formData) => {
  const newErrors = {};

  if (!formData.username) {
    newErrors.username = 'Username is required.';
  } else if (formData.username.length < 3) {
    newErrors.username = 'Username must be at least 3 characters.';
  }

  if (!formData.email) {
    newErrors.email = 'Email is required.';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    newErrors.email = 'Email is invalid.';
  }

  if (!formData.password) {
    newErrors.password = 'Password is required.';
  } else if (formData.password.length < 6) {
    newErrors.password = 'Password must be at least 6 characters.';
  }

  return newErrors;
};

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const router = useRouter();

  const { username, email, password, bio } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateAll(formData);
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      return;
    }

    try {
      const response = await axios.post('/auth/register', formData);
      const { token } = response.data;

      // Crucial: Store token in localStorage
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('token', token);
      }

      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Registration successful. Redirecting to profile';
      }

      router.push('/profile');

    } catch (err) {
      console.error(err);
      setServerError(err.response?.data?.error || 'Registration failed.');
      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Registration failed';
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Pane - Vibrant Illustration */}
      <div className={styles.leftPane}>
        <img
          src="/images/illustration/signup.webp"
          alt="Illustration"
          className={styles.illustrationBg}
        />
        <div className={styles.brand}>
          <h1>Sayings.</h1>
          <span>YourVoice</span>
        </div>
        <p className={styles.tagline}>Join us and let your voice be heard by the world.</p>
      </div>

      {/* Right Pane - Form */}
      <div className={styles.rightPane}>
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>Create Account</h2>

          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Username</label>
              <input
                id="register-username"
                type="text"
                name="username"
                value={username}
                onChange={handleChange}
                required
                className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              />
              {errors.username && (
                <span className={styles.errorMessage}>{errors.username}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={email}
                onChange={handleChange}
                required
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              />
              {errors.email && (
                <span className={styles.errorMessage}>{errors.email}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                id="register-password"
                type="password"
                name="password"
                value={password}
                onChange={handleChange}
                required
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              {errors.password && (
                <span className={styles.errorMessage}>{errors.password}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Bio (optional)</label>
              <textarea
                id="register-bio"
                name="bio"
                value={bio}
                onChange={handleChange}
                className={styles.textarea}
              />
            </div>

            <button type="submit" className={styles.button}>
              Create Account
            </button>

            <div className={styles.footer}>
              Already have an account?{' '}
              <Link href="/login" className={styles.link}>
                Login here
              </Link>
            </div>
          </form>
        </div>
      </div>
      <div id="sr-announce" className="sr-only" aria-live="polite"></div>
    </div>
  );


};

export default Register;
