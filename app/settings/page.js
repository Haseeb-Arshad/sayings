'use client';

import { Suspense, lazy, useState } from 'react';
import { FiUser, FiLock, FiBell, FiGlobe, FiShield, FiHelpCircle } from 'react-icons/fi';
import styles from '@/styles/settings.module.css';
import layoutStyles from '@/styles/Explore.module.css';

const Navbar = lazy(() => import('@/component/navBar'));
const Sidebar = lazy(() => import('@/component/sidebar'));

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = {
    account: {
      icon: <FiUser />,
      title: 'Account Settings',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Profile Information</h3>
            <div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Profile Picture</label>
                <div className={styles.flexRow}>
                  <div className={styles.profileImage}></div>
                  <button className={styles.uploadButton}>Change Photo</button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Display Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Your display name"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bio</label>
                <textarea
                  className={styles.formTextarea}
                  rows="3"
                  placeholder="Tell us about yourself"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    privacy: {
      icon: <FiLock />,
      title: 'Privacy',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Privacy Settings</h3>
            <div className={styles.formGroup}>
              <div className={styles.toggleWrapper}>
                <span>Private Account</span>
                <input type="checkbox" />
              </div>
              <div className={styles.toggleWrapper}>
                <span>Show Activity Status</span>
                <input type="checkbox" />
              </div>
              <div className={styles.toggleWrapper}>
                <span>Allow Message Requests</span>
                <input type="checkbox" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    notifications: {
      icon: <FiBell />,
      title: 'Notifications',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Notification Preferences</h3>
            <div className={styles.formGroup}>
              <div className={styles.toggleWrapper}>
                <span>Push Notifications</span>
                <input type="checkbox" />
              </div>
              <div className={styles.toggleWrapper}>
                <span>Email Notifications</span>
                <input type="checkbox" />
              </div>
              <div className={styles.toggleWrapper}>
                <span>Marketing Communications</span>
                <input type="checkbox" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    language: {
      icon: <FiGlobe />,
      title: 'Language & Region',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Language Settings</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>App Language</label>
              <select className={styles.formSelect}>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Time Zone</label>
              <select className={styles.formSelect}>
                <option>UTC (GMT+0)</option>
                <option>EST (GMT-5)</option>
                <option>PST (GMT-8)</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    security: {
      icon: <FiShield />,
      title: 'Security',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Security Settings</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Change Password</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="Current password"
              />
              <input
                type="password"
                className={styles.formInput}
                placeholder="New password"
              />
              <input
                type="password"
                className={styles.formInput}
                placeholder="Confirm new password"
              />
            </div>
            <div className={styles.toggleWrapper}>
              <span>Two-Factor Authentication</span>
              <input type="checkbox" />
            </div>
          </div>
        </div>
      ),
    },
    help: {
      icon: <FiHelpCircle />,
      title: 'Help & Support',
      content: (
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Help Center</h3>
            <div className={styles.formGroup}>
              <button className={styles.uploadButton + ' ' + styles.fullWidth}>
                FAQs
              </button>
              <button className={styles.uploadButton + ' ' + styles.fullWidth}>
                Contact Support
              </button>
              <button className={styles.uploadButton + ' ' + styles.fullWidth}>
                Report a Problem
              </button>
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className={layoutStyles.container}>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <div className={layoutStyles.mainContent}>
        <Suspense fallback={null}>
          <Sidebar setFilter={() => {}} currentFilter="recent" />
        </Suspense>
        <div className={layoutStyles.exploreSection}>
          <div className={styles.wrapper}>
            <h1 className={styles.pageTitle}>Settings</h1>
            <div className={styles.grid}>
              <div className={styles.sidebar}>
                <nav>
                  {Object.entries(tabs).map(([key, { icon, title }]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`${styles.navButton} ${
                        activeTab === key ? styles.active : ''
                      }`}
                    >
                      {icon}
                      <span>{title}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <div className={styles.content}>{tabs[activeTab].content}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
