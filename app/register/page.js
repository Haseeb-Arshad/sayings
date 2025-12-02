'use client';

import { useState, useRef, useEffect } from 'react';
import axios from '../../utils/axiosInstance';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Register.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/useAuth';

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
      if (typeof document !== 'undefined') {
        const sr = document.getElementById('sr-announce');
        if (sr) sr.textContent = 'Registration successful. Redirecting to profile';
      }
      // Redirect to profile after registration
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
          Join us and let your voice be heard by the world.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <Image
            src="/images/illustration/signup.webp"
            alt="Illustration"
            width={500}
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
            Create Account
          </motion.h2>
          {serverError && (
            <motion.p 
              className={styles.error}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
            >
              {serverError}
            </motion.p>
          )}
          
          <motion.div 
            className={styles.inputContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <motion.input
              id="register-username"
              type="text"
              name="username"
              value={username}
              onChange={handleChange}
              required
              className={`${styles.input} ${username ? styles.inputFilled : ''} ${errors.username ? styles.inputError : ''}`}
              initial={{ borderColor: 'rgba(79, 84, 92, 0.18)' }}
              animate={{ 
                borderColor: username ? 'rgba(88, 101, 242, 0.4)' : 'rgba(79, 84, 92, 0.18)'
              }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.15 }}
            />
            <motion.label 
              htmlFor="register-username"
              className={styles.inputLabel}
              initial={{
                y: 0,
                x: 0,
                scale: 1,
                color: 'var(--text-secondary)',
                opacity: 0.75
              }}
              animate={{
                y: username ? -28 : 0,
                x: 0,
                scale: username ? 0.85 : 1,
                color: username ? 'var(--primary)' : 'var(--text-secondary)',
                opacity: username ? 1 : 0.75
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.5 }}
            >
              Username
            </motion.label>
            <AnimatePresence>
              {errors.username && (
                <motion.span 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.username}
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
              id="register-email"
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className={`${styles.input} ${email ? styles.inputFilled : ''} ${errors.email ? styles.inputError : ''}`}
              initial={{ borderColor: 'rgba(79, 84, 92, 0.18)' }}
              animate={{ 
                borderColor: email ? 'rgba(88, 101, 242, 0.4)' : 'rgba(79, 84, 92, 0.18)'
              }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.15 }}
            />
            <motion.label 
              htmlFor="register-email"
              className={styles.inputLabel}
              initial={{
                y: 0,
                x: 0,
                scale: 1,
                color: 'var(--text-secondary)',
                opacity: 0.75
              }}
              animate={{
                y: email ? -28 : 0,
                x: 0,
                scale: email ? 0.85 : 1,
                color: email ? 'var(--primary)' : 'var(--text-secondary)',
                opacity: email ? 1 : 0.75
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.5 }}
            >
              Email
            </motion.label>
            <AnimatePresence>
              {errors.email && (
                <motion.span 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.email}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div 
            className={styles.inputContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <motion.input
              id="register-password"
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
              htmlFor="register-password"
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
          
          <motion.div 
            className={styles.inputContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <motion.textarea
              id="register-bio"
              name="bio"
              value={bio}
              onChange={handleChange}
              className={`${styles.textarea} ${bio ? styles.textareaFilled : ''}`}
              initial={{ borderColor: 'rgba(79, 84, 92, 0.18)' }}
              animate={{ 
                borderColor: bio ? 'rgba(88, 101, 242, 0.4)' : 'rgba(79, 84, 92, 0.18)'
              }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.15 }}
            />
            <motion.label 
              htmlFor="register-bio"
              className={styles.inputLabel}
              initial={{
                y: 0,
                x: 0,
                scale: 1,
                color: 'var(--text-secondary)',
                opacity: 0.75
              }}
              animate={{
                y: bio ? -28 : 0,
                x: 0,
                scale: bio ? 0.85 : 1,
                color: bio ? 'var(--primary)' : 'var(--text-secondary)',
                opacity: bio ? 1 : 0.75
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 0.5 }}
            >
              Bio (optional)
            </motion.label>
            <AnimatePresence>
              {errors.bio && (
                <motion.span 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.bio}
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
