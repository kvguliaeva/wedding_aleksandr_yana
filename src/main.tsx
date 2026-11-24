import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { weddingConfig } from './config';
import { getCalendar } from './wedding';
import './styles.css';

const date = getCalendar(weddingConfig.weddingDate, weddingConfig.timeZone);
document.title = `${weddingConfig.couple.groom} & ${weddingConfig.couple.bride} — ${date.dateLabel}`;
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
