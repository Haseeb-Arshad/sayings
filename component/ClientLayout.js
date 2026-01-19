'use client';

import React, { useState } from 'react';
import Navbar from './navBar';
import Sidebar from './sidebar';
import ProfileSidebar from './ProfileSidebar';
import SuggestionsSidebar from './suggestionsBar';
import styles from '../styles/Home.module.css';
import { usePathname } from 'next/navigation';

const ClientLayout = ({ children }) => {
    const [isProfileExpanded, setIsProfileExpanded] = useState(true);
    const pathname = usePathname();

    // Pages where we don't want the full layout (e.g., login, register)
    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className={styles.home}>
            <Navbar />

            {/* Navigation Sidebar (Left) */}
            <Sidebar />

            {/* Profile & Suggestions Sidebar (Right) */}
            <ProfileSidebar
                isExpanded={isProfileExpanded}
                onToggle={() => setIsProfileExpanded(!isProfileExpanded)}
            />

            <main className={`${styles.postsContainer} ${!isProfileExpanded ? styles.fullWidth : ''}`}>
                {children}
            </main>
        </div>
    );
};

export default ClientLayout;
