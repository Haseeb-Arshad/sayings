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
      setUser(response.data.user);

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
      <div className={styles.leftPane}>
        <div className={styles.decorCircle1} />
        <div className={styles.decorCircle2} />

        <div className={styles.brand}>
          <h1>Sayings.</h1>
          <div>YourVoice</div>
        </div>

        <p className={styles.tagline}>Connect through voices. Share your thoughts with the world.</p>

        <Image
          src="/images/illustration/login.png"
          alt="Illustration"
          width={900}
          height={500}
          className={styles.illustration}
          priority
        />
      </div>

      <div className={styles.rightPane}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Welcome Back</h2>

          {serverError && <p className={styles.error}>{serverError}</p>}

          <div className={styles.inputContainer}>
            <input
              id="login-identifier"
              type="text"
              name="identifier"
              value={identifier}
              onChange={handleChange}
              required
              className={`${styles.input} ${identifier ? styles.inputFilled : ''} ${
                errors.identifier ? styles.inputError : ''
              }`}
            />
            <label htmlFor="login-identifier" className={styles.inputLabel}>
              Email or Username
            </label>
            {errors.identifier && (
              <span className={styles.errorMessage}>{errors.identifier}</span>
            )}
          </div>

          <div className={styles.inputContainer}>
            <input
              id="login-password"
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              className={`${styles.input} ${password ? styles.inputFilled : ''} ${
                errors.password ? styles.inputError : ''
              }`}
            />
            <label htmlFor="login-password" className={styles.inputLabel}>
              Password
            </label>
            {errors.password && (
              <span className={styles.errorMessage}>{errors.password}</span>
            )}
          </div>

          <button type="submit" className={styles.button}>
            Login
          </button>

          <p className={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.link}>
              Register here
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
