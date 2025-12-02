'use client'
import { useState, useRef, useEffect } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Login.module.css';
import { motion, AnimatePresence } from 'framer-motion';
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
      // Update Auth Context
      setUser(response.data.user);
      // SR announce successful login for screen readers
      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Login successful. Redirecting to profile';
      }
      // Redirect to profile after login
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
        {/* Decorative elements */}
        <div className={styles.decorCircle1}></div>
        <div className={styles.decorCircle2}></div>
        
        <div className={styles.brand}>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Sayings.
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            YourVoice
          </motion.div>
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
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <Image
            src="/images/illustration/login.png"
            alt="Illustration"
            width={900}
            height={500}
            className={styles.illustration}
            priority
          />
        </motion.div>
      </div>
      
      <div className={styles.rightPane}>
        <motion.form
          onSubmit={handleSubmit}
          className={styles.form}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
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
          <motion.div 
            className={styles.inputContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <motion.input
              id="login-identifier"
              type="text"
              name="identifier"
              value={identifier}
              onChange={handleChange}
              required
              className={`${styles.input} ${identifier ? styles.inputFilled : ''} ${errors.identifier ? styles.inputError : ''}`}
              initial={{ borderColor: 'rgba(79, 84, 92, 0.18)' }}
              animate={{ 
                borderColor: identifier ? 'rgba(88, 101, 242, 0.4)' : 'rgba(79, 84, 92, 0.18)'
              }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.15 }}
            />
            <motion.label 
              htmlFor="login-identifier"
              className={styles.inputLabel}
              initial={{
                y: 0,
                x: 0,
                scale: 1,
                color: 'var(--text-secondary)',
                opacity: 0.75
              }}
              animate={{
                y: identifier ? -28 : 0,
                x: 0,
                scale: identifier ? 0.85 : 1,
                color: identifier ? 'var(--primary)' : 'var(--text-secondary)',
                opacity: identifier ? 1 : 0.75
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.5 }}
            >
              Email or Username
            </motion.label>
            <AnimatePresence>
              {errors.identifier && (
                <motion.span 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.identifier}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div 
            className={styles.inputContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.input
              id="login-password"
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              className={`${styles.input} ${password ? styles.inputFilled : ''} ${errors.password ? styles.inputError : ''}`}
              initial={{ borderColor: 'rgba(79, 84, 92, 0.18)' }}
              animate={{ 
                borderColor: password ? 'rgba(88, 101, 242, 0.4)' : 'rgba(79, 84, 92, 0.18)'
              }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.15 }}
            />
            <motion.label 
              htmlFor="login-password"
              className={styles.inputLabel}
              initial={{
                y: 0,
                x: 0,
                scale: 1,
                color: 'var(--text-secondary)',
                opacity: 0.75
              }}
              animate={{
                y: password ? -28 : 0,
                x: 0,
                scale: password ? 0.85 : 1,
                color: password ? 'var(--primary)' : 'var(--text-secondary)',
                opacity: password ? 1 : 0.75
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.5 }}
            >
              Password
            </motion.label>
            <AnimatePresence>
              {errors.password && (
                <motion.span 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.password}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
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
