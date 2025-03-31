import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import "./App.css";
import { routes } from "./routes";

const AppRoutes = () => {
  return useRoutes(routes);
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
