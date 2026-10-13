import { lazy } from 'react';
import { FEATURE_FLAGS } from 'utils/config';
import { Pool as _Pool } from 'utils/types';
import withPageTitle from './components/PageTitle';

const DCA = lazy(() => import('./pages/DCA'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const Pool = lazy(() => import('./pages/Pool'));
const Pools = lazy(() => import('./pages/Pools'));
const Create = lazy(() => import('./pages/Pools/Create'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Trade = lazy(() => import('./pages/Trade'));
const Faucet = lazy(() => import('./pages/Faucet'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Governance = lazy(() => import('./pages/Governance'));
const CreateProposal = lazy(() => import('./pages/Governance/CreateProposal'));
const Vote = lazy(() => import('./pages/Governance/Vote'));
const JELLY = lazy(() => import('./pages/JELLY'));
const CexOnRamp = lazy(() => import('./pages/CexOnRamp'));
const Floor = lazy(() => import('./pages/Floor'));
const DeployFloor = lazy(() => import('./pages/Floor/Deploy'));
const Wrapped = lazy(() => import('./pages/Wrapped'));
const Sale = lazy(() => import('./pages/Sale'));
const Vester = lazy(() => import('./pages/Vester'));
const Incentivize = lazy(() => import('./pages/Incentivize'));
const Leaderboard = lazy(() => import('./pages/Incentivize/Leaderboard'));
const Lock = lazy(() => import('./pages/Lock'));
const CreateLock = lazy(() => import('./pages/Lock/Create'));
const Bribes = lazy(() => import('./pages/Bribes'));
const Votes = lazy(() => import('./pages/Votes'));
const WidgetCreator = lazy(() => import('./pages/Widget'));

export const routeNames = {
  home: '/',
  trade: '/trade',
  pools: '/pools',
  create: '/pools/create',
  liquidityItem: '/pools/:token0/:token1/:binStep/:version',
  earn: '/earn',
  dca: '/dca',
  faucet: '/faucet',
  dashboard: '/dashboard',
  portfolio: '/portfolio',
  portfolioUser: '/portfolio/:userAddress',
  governance: '/governance',
  createProposal: '/governance/create-proposal',
  vote: '/governance/vote/:id',
  dusa: '/dusa',
  cexOnRamp: '/cexOnRamp',
  deployFloor: '/floor',
  floor: '/floor/:tokenAddress',
  wrapped: '/wrapped',
  sale: '/sale',
  vester: '/vester',
  incentivize: '/incentivize',
  leaderboard: '/incentivize/leaderboard',
  lock: '/lock',
  createLock: '/lock/create',
  bribes: '/bribes',
  incentivizedDashboard: '/incentivize/dashboard',
  incentivizedDashboardUser: '/incentivize/dashboard/:userAddress',
  createWidget: '/widget/create',
  error: '*'
} as const;

export const buildPoolRoute = (pool: _Pool) =>
  routeNames.liquidityItem
    .replace(':token0', pool.token0.address)
    .replace(':token1', pool.token1.address)
    .replace(':binStep', pool.binStep.toString())
    .replace(':version', pool.version.toString());

interface Route {
  path: (typeof routeNames)[keyof typeof routeNames];
  title: string;
  component: React.FC;
}

const routes: Array<Route> = [
  {
    path: routeNames.home,
    title: 'Home',
    component: Trade
  },
  {
    path: routeNames.trade,
    title: 'Trade',
    component: Trade
  },
  {
    path: routeNames.pools,
    title: 'Pools',
    component: Pools
  },
  {
    path: routeNames.create,
    title: 'Create Pool',
    component: Create
  },
  {
    path: routeNames.liquidityItem,
    title: 'Pool',
    component: Pool
  },
  {
    path: routeNames.faucet,
    title: 'Faucet',
    component: Faucet
  },
  {
    path: routeNames.dca,
    title: 'DCA',
    component: DCA
  },
  {
    path: routeNames.portfolio,
    title: 'Portfolio',
    component: Portfolio
  },
  {
    path: routeNames.portfolioUser,
    title: 'Portfolio',
    component: Portfolio
  },
  {
    path: routeNames.dashboard,
    title: 'Dashboard',
    component: Dashboard
  },
  {
    path: routeNames.governance,
    title: 'Governance',
    component: Governance
  },
  {
    path: routeNames.createProposal,
    title: 'Governance - Create',
    component: CreateProposal
  },
  {
    path: routeNames.vote,
    title: 'Governance - Vote',
    component: Vote
  },
  {
    path: routeNames.dusa,
    title: '$DUSA',
    component: JELLY
  },
  {
    path: routeNames.cexOnRamp,
    title: 'CEX On-Ramp',
    component: CexOnRamp
  },
  {
    path: routeNames.wrapped,
    title: '2024 Wrapped',
    component: Wrapped
  },
  { path: routeNames.sale, title: 'Sale', component: Sale },
  { path: routeNames.vester, title: 'Vester', component: Vester },
  {
    path: routeNames.incentivize,
    title: 'Incentivize',
    component: Incentivize
  },
  {
    path: routeNames.leaderboard,
    title: 'veDUSA Leaderboard',
    component: Leaderboard
  },
  {
    path: routeNames.lock,
    title: 'Lock',
    component: Lock
  },
  {
    path: routeNames.createLock,
    title: 'Create Lock',
    component: CreateLock
  },
  {
    path: routeNames.bribes,
    title: 'Bribes',
    component: Bribes
  },
  {
    path: routeNames.incentivizedDashboard,
    title: 'Dashboard',
    component: Votes
  },
  {
    path: routeNames.incentivizedDashboardUser,
    title: 'Dashboard',
    component: Votes
  },
  { path: routeNames.createWidget, title: 'Widget', component: WidgetCreator },
  {
    path: routeNames.error,
    title: 'Error',
    component: ErrorPage
  }
];

if (FEATURE_FLAGS.FLOOR) {
  routes.push({
    path: routeNames.deployFloor,
    title: 'Deploy Floor Token',
    component: DeployFloor
  });
  routes.push({
    path: routeNames.floor,
    title: 'Floor Token',
    component: Floor
  });
}

export const mappedRoutes = routes.map((route) => {
  const title = route.title ? `${route.title} • Dusa` : 'Dusa Protocol';

  const wrappedComponent = withPageTitle(title, route.component);

  return { path: route.path, component: wrappedComponent };
});
