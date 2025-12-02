'use client'

import AudioUpload from "@/component/upload";
import Navbar from "@/component/navBar";
import Sidebar from "@/component/sidebar";
import layoutStyles from "@/styles/Explore.module.css";

export default function UploadPage() {
  return (
    <div className={layoutStyles.container}>
      <Navbar />
      <div className={layoutStyles.mainContent}>
        <Sidebar setFilter={() => {}} currentFilter="recent" />
        <div className={layoutStyles.exploreSection}>
          <h1>Upload Audio</h1>
          <AudioUpload />
        </div>
      </div>
    </div>
  );
}
