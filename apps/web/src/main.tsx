import { createRoot } from 'react-dom/client';

import { WorkflowShell } from './features/svg-review-export/WorkflowShell.js';
import './styles.css';

export function PatentDrawApp() {
  return <WorkflowShell />;
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<PatentDrawApp />);
