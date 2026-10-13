import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App, { Widget } from './App';
import { mappedRoutes } from './routes';
import './index.scss';
import './index.css';

const container = document.getElementById('root');
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);
root.render(
  <BrowserRouter>
    <Routes>
      <Route path='/widget' element={<Widget />} />
      <Route path='/' element={<App />}>
        {mappedRoutes.map((route: any, index: number) => (
          <Route
            path={route.path}
            key={'route-key-' + index}
            element={<Suspense fallback={null}>{<route.component />}</Suspense>}
          />
        ))}
      </Route>
    </Routes>
  </BrowserRouter>
);

// @notice: allow JSON.stringify on objects containing BigInt
// must be defined at the root level

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
BigInt.prototype.toJSON = function (): string {
  return String(this);
};
