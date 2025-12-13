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
      await axios.post('/auth/register', formData);

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
      <div className={styles.leftPane}>
        <div className={styles.decorCircle1} />
        <div className={styles.decorCircle2} />

        <div className={styles.brand}>
          <h1>Sayings.</h1>
          <div>YourVoice</div>
        </div>

        <p className={styles.tagline}>Join us and let your voice be heard by the world.</p>

        <Image
          src="/images/illustration/signup.webp"
          alt="Illustration"
          width={500}
          height={500}
          className={styles.illustration}
          priority
        />
      </div>

      <div className={styles.rightPane}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Create Account</h2>

          {serverError && <p className={styles.error}>{serverError}</p>}

          <div className={styles.inputContainer}>
            <input
              id="register-username"
              type="text"
              name="username"
              value={username}
              onChange={handleChange}
              required
              className={`${styles.input} ${username ? styles.inputFilled : ''} ${
                errors.username ? styles.inputError : ''
              }`}
            />
            <label htmlFor="register-username" className={styles.inputLabel}>
              Username
            </label>
            {errors.username && <span className={styles.errorMessage}>{errors.username}</span>}
          </div>

          <div className={styles.inputContainer}>
            <input
              id="register-email"
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className={`${styles.input} ${email ? styles.inputFilled : ''} ${
                errors.email ? styles.inputError : ''
              }`}
            />
            <label htmlFor="register-email" className={styles.inputLabel}>
              Email
            </label>
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>

          <div className={styles.inputContainer}>
            <input
              id="register-password"
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              className={`${styles.input} ${password ? styles.inputFilled : ''} ${
                errors.password ? styles.inputError : ''
              }`}
            />
            <label htmlFor="register-password" className={styles.inputLabel}>
              Password
            </label>
            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
          </div>

          <div className={styles.inputContainer}>
            <textarea
              id="register-bio"
              name="bio"
              value={bio}
              onChange={handleChange}
              className={`${styles.textarea} ${bio ? styles.textareaFilled : ''}`}
            />
            <label htmlFor="register-bio" className={styles.inputLabel}>
              Bio (optional)
            </label>
          </div>

          <button type="submit" className={styles.button}>
            Register
          </button>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>
              Login here
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
