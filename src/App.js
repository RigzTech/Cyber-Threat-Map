import ErrorBoundary from './ErrorBoundary';
import CyberThreatMap from './CyberThreatMap';

function App() {
  return (
    <div className="app">
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <ErrorBoundary>
        <CyberThreatMap />
      </ErrorBoundary>
    </div>
  );
}
export default App; // Ensure default export