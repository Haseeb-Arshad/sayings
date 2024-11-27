'use client'
import { useState } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Login.module.css';
import { motion } from 'framer-motion';
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

    // Identifier validation (can be email or username)
    if (!identifier) {
      newErrors.identifier = 'Email or Username is required.';
    }

    // Password validation
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
      console.log('Login response:', response);
      // Update Auth Context
      setUser(response.data.user);
      // Redirect to profile after login
      router.push('/profile');
    } catch (err) {
      console.error(err);
      setServerError(err.response?.data?.error || 'Login failed.');
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
          <div>YourVoice</div>
        </div>
        <motion.p
          className={styles.tagline}
          initial="hidden"
          animate="visible"
          variants={textVariants}
          custom={1}
        >
          Connect through voices. Share your thoughts with the world.
        </motion.p>
        <Image
          src="/images/illustration/login.png"
          alt="Illustration"
          width={900}
          height={500}
          className={styles.illustration}
        />
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
            Welcome Back
          </motion.h2>
          {serverError && <p className={styles.error}>{serverError}</p>}
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="identifier"
              placeholder="Email or Username"
              value={identifier}
              onChange={handleChange}
              required
              className={`${styles.input} ${errors.identifier ? styles.inputError : ''}`}
            />
            {errors.identifier && <span className={styles.errorMessage}>{errors.identifier}</span>}
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
          <motion.button
            type="submit"
            className={styles.button}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Login
          </motion.button>
          <p className={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.link}>
              Register here
            </Link>
            .
          </p>
        </motion.form>
      </div>
    </div>
  );
};

export default Login;
