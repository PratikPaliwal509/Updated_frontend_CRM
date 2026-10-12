import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { installAuthInterceptors } from './config/httpAuth'

// Attach the login token to every API call (the API now requires it everywhere)
installAuthInterceptors()

// import "bootstrap/dist/css/bootstrap.min.css";
// import * as bootstrap from 'bootstrap'
// import './assets/scss/theme.scss'
import "./styles/index.scss";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
