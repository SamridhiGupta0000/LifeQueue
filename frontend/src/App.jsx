import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard    from './pages/Dashboard';
import Tasks        from './pages/Tasks';
import FocusMode    from './pages/FocusMode';
import Dependencies from './pages/Dependencies';
import Analytics    from './pages/Analytics';
import Settings     from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index            element={<Dashboard    />} />
          <Route path="tasks"     element={<Tasks        />} />
          <Route path="focus"     element={<FocusMode    />} />
          <Route path="dependencies" element={<Dependencies />} />
          <Route path="analytics" element={<Analytics    />} />
          <Route path="settings"  element={<Settings     />} />
          {/* Catch-all redirect */}
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
