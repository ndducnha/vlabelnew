import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IconContext } from '@phosphor-icons/react';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { LangProvider } from './lib/i18n';
import App from './App';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const saved = localStorage.getItem('vlabel.theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
        <BrowserRouter>
          <LangProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </LangProvider>
        </BrowserRouter>
      </IconContext.Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
