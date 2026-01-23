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

    const content = (
        <div
            className={styles.home}
            style={!isAuthPage ? {
                '--right-sidebar-width': isProfileExpanded ? '320px' : '60px',
                '--left-sidebar-width': '260px'
            } : {}}
        >
            {/* Animated Background System */}
            <div className="animated-bg" />
            <div className="blur-shape" style={{ top: '20%', left: '10%', opacity: 0.4 }} />
            <div className="blur-shape" style={{ top: '80%', left: '90%', animationDelay: '-5s', opacity: 0.3 }} />

            {!isAuthPage && (
                <>
                    <Navbar />
                    <Sidebar />
                    <ProfileSidebar
                        isExpanded={isProfileExpanded}
                        onToggle={() => setIsProfileExpanded(!isProfileExpanded)}
                    />
                </>
            )}

            <main className={!isAuthPage ? styles.postsContainer : ''}>
                {children}
            </main>
        </div>
    );

    return content;




};

export default ClientLayout;
