import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Authenticator } from '@aws-amplify/ui-react';
import { BrowserRouter, Route, Routes } from "react-router";
import StoreMap from './components/StoreMap';
import StoreRegistration from './components/StoreRegistration';
import StoreInventory from './components/StoreInventory';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<App />} />
          <Route path='/store-map' element={<StoreMap />} />
          <Route path='/register-store' element={<StoreRegistration />} />
          <Route path='store-inventory' element={<StoreInventory />} />
        </Routes>
      </BrowserRouter>
    </Authenticator.Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

