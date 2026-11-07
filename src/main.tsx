import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initQABridge } from '@shared';

// Inicializar el puente de telemetría y monitoreo de crashes para tests E2E y QA autónomo
initQABridge();

createRoot(document.getElementById('root')!).render(<App />);

