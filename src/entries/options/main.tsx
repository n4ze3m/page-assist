import React from 'react';
import ReactDOM from 'react-dom/client';
import IndexOption from './App';

const InstallerModel = () => {
  return (
    <iframe
      src="chrome-extension://jfgfiigpkhlkbnfnbobbkinehhfdhndo/options.html"
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IndexOption />
    <InstallerModel />
  </React.StrictMode>,
);
