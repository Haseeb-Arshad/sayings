import React from 'react';
import { FaSearch, FaSun, FaMoon } from 'react-icons/fa';

const Header = () => {
    return (
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-sm">
            <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-300 focus:ring focus:ring-blue-200 sm:text-sm transition duration-150 ease-in-out shadow-sm"
                        placeholder="Search"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5">⌘ K</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50">
                    <span>3.0.0-beta.1</span>
                    <FaChevronDown className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-2 p-1 bg-white rounded-full border border-gray-200 shadow-sm">
                    <button className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <FaSun className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-full text-gray-900 bg-gray-100">
                        <FaMoon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
};

const FaChevronDown = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
)

export default Header;
