import React from 'react';
import Link from 'next/link';
import { FaBook, FaRocket, FaLayerGroup, FaHistory, FaShapes, FaMap, FaFigma, FaMobileAlt, FaPalette, FaMagic, FaPenFancy, FaVideo, FaThLarge, FaRobot, FaServer, FaBars, FaChevronDown } from 'react-icons/fa';

const SidebarItem = ({ icon: Icon, label, href = '#', active = false, hasSubmenu = false }) => (
    <Link href={href} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
        </div>
        {hasSubmenu && <FaChevronDown className="w-3 h-3 text-gray-400" />}
    </Link>
);

const SidebarSection = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
        <div className="space-y-0.5">
            {children}
        </div>
    </div>
);

const Sidebar = () => {
    return (
        <aside className="w-64 h-screen overflow-y-auto border-r border-border bg-background hidden md:block sticky top-0">
            <div className="p-4">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-6 h-6 bg-black rounded-full"></div> {/* Logo Placeholder */}
                    <span className="text-lg font-bold text-primary">hero</span>
                </div>

                <SidebarSection title="Getting Started">
                    <SidebarItem icon={FaBook} label="Introduction" />
                    <SidebarItem icon={FaRocket} label="Quick Start" />
                    <SidebarItem icon={FaLayerGroup} label="Design Principles" />
                    <SidebarItem icon={FaHistory} label="Changelog" hasSubmenu />
                    <div className="ml-9 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-800">
                            v3.0.0-beta.1
                        </span>
                    </div>
                    <SidebarItem icon={FaShapes} label="Showcase" />
                    <SidebarItem icon={FaMap} label="Roadmap" />
                    <SidebarItem icon={FaFigma} label="Figma" />
                    <SidebarItem icon={FaMobileAlt} label="React Native" />
                </SidebarSection>

                <SidebarSection title="Handbook">
                    <SidebarItem icon={FaPalette} label="Colors" />
                    <SidebarItem icon={FaMagic} label="Theming" />
                    <SidebarItem icon={FaPenFancy} label="Styling" />
                    <SidebarItem icon={FaVideo} label="Animation" />
                    <SidebarItem icon={FaThLarge} label="Composition" />
                </SidebarSection>

                <SidebarSection title="UI for Agents">
                    <SidebarItem icon={FaRobot} label="LLMs.txt" />
                    <SidebarItem icon={FaServer} label="MCP Server" />
                </SidebarSection>

                <SidebarSection title="Components">
                    <SidebarItem label="Accordion" />
                    <SidebarItem label="Alert" />
                    <SidebarItem label="Avatar" />
                    <SidebarItem label="Button" />
                    <SidebarItem label="Card" />
                    <SidebarItem label="Checkbox" />
                    <SidebarItem label="CheckboxGroup" />
                </SidebarSection>
            </div>
        </aside>
    );
};

export default Sidebar;
