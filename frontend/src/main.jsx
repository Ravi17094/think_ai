import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import { store } from "./app/store";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            theme="colored"
          />
        </>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);