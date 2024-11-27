'use client';

import { useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Register.module.css';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

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

  const validate = (field, value) => {
    let error = '';

    switch (field) {
      case 'username':
        if (!value) {
          error = 'Username is required.';
        } else if (value.length < 3) {
          error = 'Username must be at least 3 characters.';
        }
        break;
      case 'email':
        if (!value) {
          error = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = 'Email is invalid.';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required.';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters.';
        }
        break;
      default:
        break;
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: error,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });
    validate(name, value);
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Perform final validation
    Object.keys(formData).forEach((field) => {
      validate(field, formData[field]);
      if (errors[field]) {
        newErrors[field] = errors[field];
      }
    });

    if (Object.values(newErrors).some((error) => error)) {
      return;
    }

    try {
      const response = await axios.post('/auth/register', formData);
      // Token is set via HTTP-only cookie
      // Redirect to profile after registration
      router.push('/profile');
    } catch (err) {
      console.error(err);
      setServerError(err.response?.data?.error || 'Registration failed.');
    }
  };

  // Staggered animation for text
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
      },
    }),
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <div className={styles.brand}>
          {/* <Image src="/logo.svg" alt="Logo" width={50} height={50} /> */}
          <h1>Sayings.</h1>
          <h4>YourVoice</h4>
        </div>
        <motion.p
          className={styles.tagline}
          initial="hidden"
          animate="visible"
          variants={textVariants}
          custom={1}
        >
          Join us and let your voice be heard by the world.
        </motion.p>
        {/* <Image
          src="/images/illustration/signup.webp"
          alt="Illustration"
          width={500}
          height={500}
          className={styles.illustration}
        /> */}
      </div>
      <div className={styles.rightPane}>
        <motion.form
          onSubmit={handleSubmit}
          className={styles.form}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h2
            className={styles.title}
            initial="hidden"
            animate="visible"
            variants={textVariants}
            custom={2}
          >
            Create Account
          </motion.h2>
          {serverError && <p className={styles.error}>{serverError}</p>}
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={username}
              onChange={handleChange}
              required
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
            />
            {errors.username && <span className={styles.errorMessage}>{errors.username}</span>}
          </div>
          <div className={styles.inputGroup}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={handleChange}
              required
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>
          <div className={styles.inputGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={handleChange}
              required
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
            />
            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
          </div>
          <div className={styles.inputGroup}>
            <textarea
              name="bio"
              placeholder="Bio (optional)"
              value={bio}
              onChange={handleChange}
              className={`${styles.textarea}`}
            ></textarea>
          </div>
          <motion.button
            type="submit"
            className={styles.button}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Register
          </motion.button>
          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>
              Login here
            </Link>
            .
          </p>
        </motion.form>
      </div>
    </div>
  );
};

export default Register;
