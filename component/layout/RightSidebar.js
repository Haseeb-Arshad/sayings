import React from 'react';

const RightSidebar = () => {
    return (
        <aside className="w-64 h-screen overflow-y-auto border-l border-border bg-background hidden xl:block sticky top-0 p-6">
            <div className="mb-8">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
                    <span className="text-gray-400">≡</span> On this page
                </h3>
                <ul className="space-y-3 text-sm text-gray-500">
                    <li className="hover:text-gray-900 cursor-pointer">Installation</li>
                    <li className="hover:text-gray-900 cursor-pointer">What's New</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">New Design System</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">New Components</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Alert</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Checkbox & CheckboxGroup</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">InputOTP</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Listbox</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Select</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Slider</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Surface</li>
                    <li className="hover:text-gray-900 cursor-pointer font-medium text-gray-900">Improved Component APIs</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Flexible Component Patterns</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Global Animation Control</li>
                    <li className="hover:text-gray-900 cursor-pointer text-amber-600 flex items-center gap-1">
                        ⚠️ Breaking Changes
                    </li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Design System Variables</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Panel → Surface & Overlay</li>
                    <li className="pl-4 hover:text-gray-900 cursor-pointer">Surface Levels Simplified</li>
                </ul>
            </div>

            <div className="mt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Hero Newsletter</h4>
                <div className="flex flex-col gap-2">
                    <input
                        type="email"
                        placeholder="name@email.com"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button className="w-full px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Subscribe
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
