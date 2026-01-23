'use client';

import pStyles from '../styles/ProfileSidebar.module.css';
import { FaComment, FaEllipsisH, FaMapMarkerAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const ProfileSidebar = ({ isExpanded = true, onToggle }) => {
    return (
        <aside className={`${pStyles.profileSidebar} ${!isExpanded ? pStyles.collapsed : ''}`}>
            <button className={pStyles.toggleButton} onClick={onToggle} aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}>
                {isExpanded ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
            </button>

            {isExpanded && (
                <div className={pStyles.sidebarContent}>
                    {/* Profile Header Banner */}
                    <div className={pStyles.profileHeaderBanner}>
                        <img src="/profile-banner.jpg" alt="Profile Banner" className={pStyles.bannerImage} />
                    </div>

                    {/* Profile Avatar and Name */}
                    <div className={pStyles.profileContainer}>
                        <div className={pStyles.profileAvatar}>
                            <img src="/avatar-placeholder.png" alt="Profile" />
                        </div>

                        <div className={pStyles.userHeader}>
                            <div className={pStyles.userName}>
                                <span className={pStyles.name}>tom</span>
                                <span className={pStyles.pronouns}>he/him</span>
                            </div>
                            <div className={pStyles.userStatus}>Now</div>
                        </div>
                    </div>

                    {/* Bio Section */}
                    <div className={pStyles.aboutSection}>About</div>
                    <div className={pStyles.bioText}>Sharing thoughts on sound, design, and simplicity.</div>
                    <div className={pStyles.bioDetails}>Always learning. Building in public.</div>

                    {/* Song Reference */}
                    <div className={pStyles.songReference}>
                        <div className={pStyles.songTitle}>
                            <span className={pStyles.songName}>Now Playing</span>
                            <span className={pStyles.artistName}> — Unknown Artist</span>
                        </div>
                        <div className={pStyles.duration}>-0:24</div>
                    </div>

                    <div className={pStyles.listenButtonContainer}>
                        <button className={pStyles.listenButton}>
                            <FaComment size={14} /> Listen Along
                        </button>
                    </div>

                    {/* Location info */}
                    <div className={pStyles.locationInfo}>
                        <FaMapMarkerAlt size={14} className={pStyles.locationIcon} />
                        Philadelphia, PA
                    </div>

                    <div className={pStyles.timeWidget}>
                        <div className={pStyles.time}>10:04 <span>AM</span></div>
                        <div className={pStyles.timeZone}>CET—Today <span className={pStyles.timeOffset}>+7hrs</span></div>
                        <div className={pStyles.location}>
                            <span>Fr, Marseille</span>
                        </div>
                    </div>

                    {/* Chat Button */}
                    <div className={pStyles.chatButtonContainer}>
                        <button className={pStyles.chatButton}>
                            Chat
                            <div className={pStyles.chatButtonIcon}><FaEllipsisH size={12} /></div>
                        </button>
                    </div>
                </div>
            )}
            {!isExpanded && (
                <div className={pStyles.collapsedIcon} onClick={onToggle}>
                    <img src="/avatar-placeholder.png" alt="Profile" className={pStyles.miniAvatar} />
                </div>
            )}
        </aside>
    );
};

export default ProfileSidebar;
