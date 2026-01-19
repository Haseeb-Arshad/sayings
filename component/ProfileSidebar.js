'use client';

import styles from '../styles/ProfileSidebar.module.css';
import { FaComment, FaEllipsisH, FaMapMarkerAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const ProfileSidebar = ({ isExpanded = true, onToggle }) => {
    return (
        <aside className={`${styles.profileSidebar} ${!isExpanded ? styles.collapsed : ''}`}>
            <button className={styles.toggleButton} onClick={onToggle} aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}>
                {isExpanded ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
            </button>

            {isExpanded && (
                <div className={styles.sidebarContent}>
                    {/* Profile Header Banner */}
                    <div className={styles.profileHeaderBanner}>
                        <img src="/profile-banner.jpg" alt="Profile Banner" className={styles.bannerImage} />
                    </div>

                    {/* Profile Avatar and Name */}
                    <div className={styles.profileContainer}>
                        <div className={styles.profileAvatar}>
                            <img src="/avatar-placeholder.png" alt="Profile" />
                        </div>

                        <div className={styles.userHeader}>
                            <div className={styles.userName}>
                                <span className={styles.name}>tom</span>
                                <span className={styles.pronouns}>he/him</span>
                            </div>
                            <div className={styles.userStatus}>Now</div>
                        </div>
                    </div>

                    {/* Bio Section */}
                    <div className={styles.aboutSection}>About</div>
                    <div className={styles.bioText}>Sharing thoughts on sound, design, and simplicity.</div>
                    <div className={styles.bioDetails}>Always learning. Building in public.</div>

                    {/* Song Reference */}
                    <div className={styles.songReference}>
                        <div className={styles.songTitle}>
                            <span className={styles.songName}>Now Playing</span>
                            <span className={styles.artistName}> — Unknown Artist</span>
                        </div>
                        <div className={styles.duration}>-0:24</div>
                    </div>

                    <div className={styles.listenButtonContainer}>
                        <button className={styles.listenButton}>
                            <FaComment size={14} /> Listen Along
                        </button>
                    </div>

                    {/* Location info */}
                    <div className={styles.locationInfo}>
                        <FaMapMarkerAlt size={14} className={styles.locationIcon} />
                        Philadelphia, PA
                    </div>

                    <div className={styles.timeWidget}>
                        <div className={styles.time}>10:04 <span>AM</span></div>
                        <div className={styles.timeZone}>CET—Today <span className={styles.timeOffset}>+7hrs</span></div>
                        <div className={styles.location}>
                            <span>Fr, Marseille</span>
                        </div>
                    </div>

                    {/* Chat Button */}
                    <div className={styles.chatButtonContainer}>
                        <button className={styles.chatButton}>
                            Chat
                            <div className={styles.chatButtonIcon}><FaEllipsisH size={12} /></div>
                        </button>
                    </div>
                </div>
            )}
            {!isExpanded && (
                <div className={styles.collapsedIcon} onClick={onToggle}>
                    <img src="/avatar-placeholder.png" alt="Profile" className={styles.miniAvatar} />
                </div>
            )}
        </aside>
    );
};

export default ProfileSidebar;
