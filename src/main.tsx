import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Remove the static loader once React has painted the first frame
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('fade-out');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }
  });
});
