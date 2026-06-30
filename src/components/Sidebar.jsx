import React from 'react';

// A simple Netflix-style collapsible sidebar
export default function Sidebar({ 
  isFocused, 
  onFocus, 
  currentView, 
  onNavigate 
}) {
  const menuItems = [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'channels', icon: '🏠', label: 'Home' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <div 
      className={`sidebar ${isFocused ? 'expanded' : 'collapsed'}`}
      onMouseEnter={onFocus}
    >
      <div className="sidebar-content">
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            className={`sidebar-item ${currentView === item.id ? 'active' : ''} ${isFocused ? 'focusable card-focused' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {isFocused && <span className="sidebar-label">{item.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
