'use client';

import React from 'react';
import styles from '../styles/GallerySidebar.module.css';
import {
    FaBorderAll,
    FaLaptop,
    FaCaretSquareDown,
    FaTh,
    FaColumns,
    FaSearch,
    FaVolumeUp,
    FaExpand,
    FaChevronRight,
    FaArrowLeft
} from 'react-icons/fa';

const GallerySidebar = () => {
    const navItems = [
        { id: 'all', label: 'All Types', icon: FaBorderAll, colorClass: styles.iconAll },
        { id: 'static', label: 'Static', icon: FaLaptop, colorClass: styles.iconStatic },
        { id: 'dropdown', label: 'Dropdown', icon: FaCaretSquareDown, colorClass: styles.iconDropdown },
        { id: 'mega', label: 'Mega Menu', icon: FaTh, colorClass: styles.iconMega },
        { id: 'sidebar', label: 'Side Bar', icon: FaColumns, colorClass: styles.iconSide },
        { id: 'search', label: 'Search Bar', icon: FaSearch, colorClass: styles.iconSearch },
        { id: 'announce', label: 'Announcement', icon: FaVolumeUp, colorClass: styles.iconAnnounce },
        { id: 'full', label: 'Full Screen', icon: FaExpand, colorClass: styles.iconFull },
        { id: 'bread', label: 'Breadcrumbs', icon: FaChevronRight, colorClass: styles.iconBread }
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h1 className={styles.title}>Navbar Gallery</h1>
                <button className={styles.toggleBtn} aria-label="Toggle sidebar">
                    <FaArrowLeft size={10} />
                </button>
            </div>

            <div className={styles.divider} />

            <nav className={styles.navList}>
                {navItems.map((item, index) => (
                    <button
                        key={item.id}
                        className={styles.navItem}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className={`${styles.iconBox} ${item.colorClass}`}>
                            <item.icon />
                        </div>
                        <span className={styles.label}>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className={styles.footerCard}>
                <h2 className={styles.footerTitle}>
                    Never run out of design inspiration again.
                </h2>
                <p className={styles.footerText}>
                    Featuring over 1,200 iOS, Android & Web apps on <span className={styles.footerLink}>Mobbin.com</span>
                </p>
            </div>
        </aside>
    );
};

export default GallerySidebar;
