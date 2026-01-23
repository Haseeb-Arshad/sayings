'use client';

import { useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Login.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/useAuth';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const router = useRouter();
  const { login: setUser } = useAuth();

  const { identifier, password } = formData;

  const validate = () => {
    const newErrors = {};

    if (!identifier) {
      newErrors.identifier = 'Email or Username is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const response = await axios.post('/auth/login', formData);
      const { token, user } = response.data;

      // Crucial: Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      setUser(user);

      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Login successful. Redirecting to profile';
      }

      router.push('/profile');

    } catch (err) {
      console.error(err);
      setServerError(err.response?.data?.error || 'Login failed.');
      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Login failed';
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
          <h2 className={styles.formTitle}>Welcome Back</h2>

          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email or Username</label>
              <input
                id="login-identifier"
                type="text"
                name="identifier"
                value={identifier}
                onChange={handleChange}
                required
                className={`${styles.input} ${errors.identifier ? styles.inputError : ''}`}
              />
              {errors.identifier && (
                <span className={styles.errorMessage}>{errors.identifier}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                id="login-password"
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

            <button type="submit" className={styles.button}>
              Login
            </button>

            <div className={styles.footer}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className={styles.link}>
                Register here
              </Link>
            </div>
          </form>
        </div>
      </div>
      <div id="sr-announce" className="sr-only" aria-live="polite"></div>
    </div>
  );


};

export default Login;
