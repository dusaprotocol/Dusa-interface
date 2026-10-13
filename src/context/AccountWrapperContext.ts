import { createContext } from 'react';
import { ProviderService } from 'hooks/useWalletProvider';
import { dCA, Order } from 'utils/trpc';
import {
  Lock,
  PoolLiquidity,
  RefetchDrawerElement,
  TokenInfo
} from 'utils/types';

export interface AccountService {
  portfolioValue: number;
  tokensValue: number;
  rollsValue: number;
  poolsValue: number;
  autopoolsValue: number;
  rolls: number;
  tokensInfo: TokenInfo[] | undefined;
  poolsOwn: PoolLiquidity[] | undefined;
  autoPoolsOwn: PoolLiquidity[] | undefined;
  activeDCAs: dCA[] | undefined;
  dcasHistory: dCA[] | undefined;
  orders: Order[];
  locks: Lock[] | undefined;
  locksValue: number;
  isLoading: (elements?: RefetchDrawerElement[]) => boolean;
  refetch: (elements?: RefetchDrawerElement[]) => void;
}

export interface AccountWrapperContextType
  extends AccountService, ProviderService {
  showDrawer: boolean;
  setShowDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  closeDrawer: () => void;
}

export const AccountWrapperContext = createContext<AccountWrapperContextType>(
  {} as AccountWrapperContextType
);
