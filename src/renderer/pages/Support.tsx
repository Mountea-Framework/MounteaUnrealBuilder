import React from 'react';

const Support: React.FC = () => {
  const supportLinks = [
    {
      id: 'discord',
      title: 'Discord Community',
      description: 'Join our Discord server for support and discussions',
      url: 'https://discord.gg/skK5ypRyDh',
      icon: 'forum',
      color: '#5865F2',
    },
    {
      id: 'home',
      title: 'Mountea Tools',
      description: 'Visit our official website for more tools and resources',
      url: 'https://mountea.tools',
      icon: 'home',
      color: '#2196F3',
    },
    {
      id: 'github',
      title: 'Source Code',
      description: 'View the source code, report issues, or contribute',
      url: 'https://github.com/Mountea-Framework/MounteaUnrealBuilder',
      icon: 'code',
      color: '#7c838aff',
    },
    {
      id: 'patreon',
      title: 'Patreon',
      description: 'Support development through Patreon',
      url: 'https://www.patreon.com/c/mountea',
      icon: 'volunteer_activism',
      color: '#FF424D',
    },
    {
      id: 'sponsor',
      title: 'GitHub Sponsors',
      description: 'Sponsor us on GitHub to help maintain this project',
      url: 'https://github.com/sponsors/Mountea-Framework',
      icon: 'favorite',
      color: '#EA4AAA',
    },
  ];

  const handleLinkClick = (url: string) => {
    window.electronAPI.openExternal(url);
  };

  return (
    <div className="page support">
      <header className="page-header">
        <h2>Support & Community</h2>
      </header>

      <div className="page-content">
        <div className="section">
          <p className="help-text" style={{ marginBottom: '2rem', fontSize: '0.9375rem' }}>
            Thank you for using Unreal Builder! Connect with us through any of these channels.
          </p>

          <div className="support-grid">
            {supportLinks.map(link => (
              <div
                key={link.id}
                className="support-card"
                onClick={() => handleLinkClick(link.url)}
                style={{ cursor: 'pointer' }}
              >
                <div className="support-card-icon" style={{ backgroundColor: `${link.color}15` }}>
                  <span 
                    className="material-symbols-outlined" 
                    style={{ color: link.color, fontSize: '2.5rem' }}
                  >
                    {link.icon}
                  </span>
                </div>
                <div className="support-card-content">
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                  <div className="support-card-link">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                      open_in_new
                    </span>
                    <span>Visit</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section" style={{ marginTop: '2rem' }}>
          <h3>About Unreal Builder</h3>
          <p className="help-text" style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
            Unreal Builder is an open-source tool designed to streamline the process of building 
            Unreal Engine plugins and projects. It provides a centralized interface for managing 
            multiple engine versions, build configurations, and automated workflows.
          </p>
          <p className="help-text" style={{ marginTop: '1rem', lineHeight: '1.6' }}>
            This project is maintained by the Mountea Framework made for Unreal developers.
          </p>
        </div>

        <div className="section" style={{ marginTop: '2rem' }}>
          <h3>Version Information</h3>
          <div style={{ marginTop: '1rem' }}>
            <div className="project-detail" style={{ marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined">info</span>
              <span>Version 1.0.4</span>
            </div>
            <div className="project-detail">
              <span className="material-symbols-outlined">code</span>
              <span>Built with Electron, React & TypeScript</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;