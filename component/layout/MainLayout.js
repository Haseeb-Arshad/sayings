import React from 'react';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-background font-sans text-primary">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            <RightSidebar />
        </div>
    );
};

export default MainLayout;
