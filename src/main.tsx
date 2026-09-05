import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@app/App';
import '@app/styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Obsipix: root element #root was not found in the document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
