import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/layout.css';


// 🔑 Capture token from Google redirect
const params = new URLSearchParams(window.location.search);

const token = params.get("token");
const email = params.get("email");

if (token) {

  localStorage.setItem("access_token", token);

  if (email) {
    localStorage.setItem("user_email", email);
  }

  window.history.replaceState({}, document.title, "/");
}


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  
    <BrowserRouter>
      <App />
    </BrowserRouter>
  
);

reportWebVitals();