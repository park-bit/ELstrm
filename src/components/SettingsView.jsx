import React from 'react';
import { removeLastSource } from '../utils/storage';

export default function SettingsView({ onClearDefault }) {
  return (
    <div className="settings-view">
      <h2 className="page-title">Settings</h2>
      
      <div className="settings-card">
        <h3>Startup Settings</h3>
        <p>The app currently remembers your last selected source/country.</p>
        <button 
          className="danger-btn"
          onClick={() => {
            removeLastSource();
            onClearDefault();
          }}
        >
          Clear Default Country / Source
        </button>
      </div>
    </div>
  );
}
