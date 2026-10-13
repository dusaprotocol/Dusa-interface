import { InterfaceLevel } from 'context/SettingsContext';
import { storageThemeVersion, routerSC } from './config';
import { MCAP } from './constants';
import { MASSA, USDC } from './tokens';
import { PoolWithAddress } from './types';
import { Token, Transaction } from './types';

const betaId = routerSC;

// SLIPPAGE

export const setSwapSlippage = (slippage: number) =>
  localStorage.setItem(`swapSlippage${betaId}`, slippage.toString());

export const getSwapSlippage = (): number =>
  Math.round(Number(localStorage.getItem(`swapSlippage${betaId}`) ?? '5'));

export const setDcaSlippage = (slippage: number) =>
  localStorage.setItem(`dcaSlippage${betaId}`, slippage.toString());

export const getDcaSlippage = (): number =>
  Math.round(Number(localStorage.getItem(`dcaSlippage${betaId}`) ?? '30'));

export const setAmountLiquiditySlippage = (slippage: number) =>
  localStorage.setItem(`amountLiquiditySlippage${betaId}`, slippage.toString());

export const getAmountLiquiditySlippage = (): number =>
  Math.round(
    Number(localStorage.getItem(`amountLiquiditySlippage${betaId}`) ?? '50')
  );

export const setPriceLiquiditySlippage = (slippage: number) =>
  localStorage.setItem(`priceLiquiditySlippage${betaId}`, slippage.toString());

export const getPriceLiquiditySlippage = (): number =>
  Math.round(
    Number(localStorage.getItem(`priceLiquiditySlippage${betaId}`) ?? '50')
  );

// AIRDROP

export const setAirdropMcap = (mcap: number) =>
  localStorage.setItem(`airdropMcap${betaId}`, mcap.toString());

export const getAirdropMcap = (): number =>
  Math.round(Number(localStorage.getItem(`airdropMcap${betaId}`) ?? MCAP));

// INTERFACE PREFERENCES

const interfaceLevelKey = `interfaceLevel${betaId}`;
export const setInterfaceLevel = (interfaceLevel: InterfaceLevel) =>
  localStorage.setItem(interfaceLevelKey, interfaceLevel);

export const getInterfaceLevel = (): InterfaceLevel =>
  (localStorage.getItem(interfaceLevelKey) ?? 'pro') as InterfaceLevel;

const showInterfaceAgainKey = `showInterfaceAgain${betaId}`;
export const getShowInterfaceAgain = (): boolean =>
  localStorage.getItem(showInterfaceAgainKey) === null;
export const setShowInterfaceAgain = (show: boolean) =>
  localStorage.setItem(showInterfaceAgainKey, show.toString());

export const getInterfaceTheme = (): string | null =>
  localStorage.getItem('theme' + storageThemeVersion);

export const setInterfaceTheme = (theme: string) =>
  localStorage.setItem('theme' + storageThemeVersion, theme);

export const getIsOverlay = (): boolean =>
  (localStorage.getItem('isOverlay' + storageThemeVersion) ?? 'true') ===
  'true';

export const setIsOverlay = (isOverlay: boolean) =>
  localStorage.setItem('isOverlay' + storageThemeVersion, String(isOverlay));

export const getSimulateTx = (): boolean =>
  (localStorage.getItem('simulateTx' + betaId) ?? 'true') === 'true';

export const setSimulateTx = (simulateTx: boolean) =>
  localStorage.setItem('simulateTx' + betaId, String(simulateTx));

export const getRPCURL = (): string => {
  const rpcURL = localStorage.getItem('rpcURL') || '';
  if (rpcURL.startsWith('https://')) return rpcURL;
  return '';
};

export const setRPCURL = (rpcURL: string) =>
  localStorage.setItem('rpcURL', rpcURL);

// TOKENS

const importedTokensKey = `importedTokens${betaId}`;
export const getImportedTokens = (): Token[] => {
  const tokens = JSON.parse(
    localStorage.getItem(importedTokensKey) ?? '[]'
  ) as Token[];
  return tokens.map(transformToken);
};
export const updateImportedTokens = (tokens: Token[]) =>
  localStorage.setItem(importedTokensKey, JSON.stringify(tokens));

const favTokensKey = `favTokens${betaId}`;
export const getFavTokens = (): Token[] => {
  const tokens = JSON.parse(
    localStorage.getItem(favTokensKey) ?? '[]'
  ) as Token[];
  return tokens.map(transformToken);
};

export const updateFavTokens = (fav: Token[]) =>
  localStorage.setItem(favTokensKey, JSON.stringify(fav));

const lastTokensKey = `tokens${betaId}`;
export const getLastTokens = (): [Token | undefined, Token | undefined] => {
  const tokens = JSON.parse(localStorage.getItem(lastTokensKey) ?? '[]');
  return tokens.map(
    (token: Token | undefined) => token && transformToken(token)
  );
};

export const updateLastTokens = (
  tokens: [Token | undefined, Token | undefined]
) => localStorage.setItem(lastTokensKey, JSON.stringify(tokens));

// POOLS

const poolsCreatedKey = `poolsWithAddressCreated${betaId}`;
export const getPoolsCreated = (): PoolWithAddress[] => {
  const pools = JSON.parse(
    localStorage.getItem(poolsCreatedKey) ?? '[]'
  ) as PoolWithAddress[];
  return pools.map((pool: PoolWithAddress) => ({
    token0: transformToken(pool.token0),
    token1: transformToken(pool.token1),
    binStep: pool.binStep,
    pairAddress: pool.pairAddress ?? '',
    version: pool.version || 'V1'
  }));
};
export const updatePoolsCreated = (pools: PoolWithAddress[]) =>
  localStorage.setItem(poolsCreatedKey, JSON.stringify(pools));

const poolsImportedKey = `poolsWithAddressImported${betaId}`;
export const getImportedPools = (): PoolWithAddress[] => {
  const pools = JSON.parse(
    localStorage.getItem(poolsImportedKey) ?? '[]'
  ) as PoolWithAddress[];
  return pools.map((pool: PoolWithAddress) => ({
    token0: transformToken(pool.token0),
    token1: transformToken(pool.token1),
    binStep: pool.binStep,
    pairAddress: pool.pairAddress ?? '',
    version: pool.version || 'V1'
  }));
};
export const updateImportedPools = (pools: PoolWithAddress[]) =>
  localStorage.setItem(poolsImportedKey, JSON.stringify(pools));

// DCA

export const getPendingDCACreation = (userAddress: string): number[] =>
  JSON.parse(localStorage.getItem('pendingDCACreation' + userAddress) ?? '[]');

export const setPendingDCACreation = (userAddress: string, id: number) =>
  localStorage.setItem(
    'pendingDCACreation' + userAddress,
    JSON.stringify([...getPendingDCACreation(userAddress), id])
  );

export const setPendingDCACreationRemove = (
  userAddress: string,
  id: number[]
) =>
  localStorage.setItem(
    'pendingDCACreation' + userAddress,
    JSON.stringify(
      getPendingDCACreation(userAddress).filter((dca) => !id.includes(dca))
    )
  );

export const getPendingDCADelete = (userAddress: string): number[] =>
  JSON.parse(localStorage.getItem('pendingDCADelete' + userAddress) ?? '[]');

export const setPendingDCADelete = (userAddress: string, id: number) =>
  localStorage.setItem(
    'pendingDCADelete' + userAddress,
    JSON.stringify([...getPendingDCADelete(userAddress), id])
  );

export const setPendingDCADeleteRemove = (userAddress: string, id: number[]) =>
  localStorage.setItem(
    'pendingDCADelete' + userAddress,
    JSON.stringify(
      getPendingDCADelete(userAddress).filter((dca) => !id.includes(dca))
    )
  );

export const getPendingDCAUpdate = (userAddress: string): number[] =>
  JSON.parse(localStorage.getItem('pendingDCAUpdate' + userAddress) ?? '[]');

export const setPendingDCAUpdate = (userAddress: string, id: number) =>
  localStorage.setItem(
    'pendingDCAUpdate' + userAddress,
    JSON.stringify([...getPendingDCAUpdate(userAddress), id])
  );

export const setPendingDCAUpdateRemove = (userAddress: string, id: number[]) =>
  localStorage.setItem(
    'pendingDCAUpdate' + userAddress,
    JSON.stringify(
      getPendingDCAUpdate(userAddress).filter((dca) => !id.includes(dca))
    )
  );

const lastTokensDCAKey = `tokensDCA${betaId}`;
export const getLastTokensDCA = (): [Token | undefined, Token | undefined] => {
  const tokens = JSON.parse(localStorage.getItem(lastTokensDCAKey) ?? '[]');
  if (!tokens.length) return [USDC, MASSA];
  return tokens.map((token: Token) => token && transformToken(token));
};

export const updateLastTokensDCA = (
  tokens: [Token | undefined, Token | undefined]
) => localStorage.setItem(lastTokensDCAKey, JSON.stringify(tokens));

// LIMIT ORDERS

export type PendingLimitOrder = {
  id: number;
  scAddress: string;
};

export const getPendingLimitOrderCreation = (
  userAddress: string
): PendingLimitOrder[] =>
  JSON.parse(
    localStorage.getItem('pendingLimitOrderCreation' + userAddress) ?? '[]'
  );

export const setPendingLimitOrderCreation = (
  userAddress: string,
  order: PendingLimitOrder
) =>
  localStorage.setItem(
    'pendingLimitOrderCreation' + userAddress,
    JSON.stringify([...getPendingLimitOrderCreation(userAddress), order])
  );

export const setPendingLimitOrderCreationRemove = (
  userAddress: string,
  orders: PendingLimitOrder[]
) =>
  localStorage.setItem(
    'pendingLimitOrderCreation' + userAddress,
    JSON.stringify(
      getPendingLimitOrderCreation(userAddress).filter(
        (storedOrder) =>
          !orders.some(
            (order) =>
              order.id === storedOrder.id &&
              order.scAddress === storedOrder.scAddress
          )
      )
    )
  );

export const getPendingLimitOrderDelete = (
  userAddress: string
): PendingLimitOrder[] =>
  JSON.parse(
    localStorage.getItem('pendingLimitOrderDelete' + userAddress) ?? '[]'
  );

export const setPendingLimitOrderDelete = (
  userAddress: string,
  order: PendingLimitOrder
) =>
  localStorage.setItem(
    'pendingLimitOrderDelete' + userAddress,
    JSON.stringify([...getPendingLimitOrderDelete(userAddress), order])
  );

export const setPendingLimitOrderDeleteRemove = (
  userAddress: string,
  orders: PendingLimitOrder[]
) =>
  localStorage.setItem(
    'pendingLimitOrderDelete' + userAddress,
    JSON.stringify(
      getPendingLimitOrderDelete(userAddress).filter(
        (storedOrder) =>
          !orders.some(
            (order) =>
              order.id === storedOrder.id &&
              order.scAddress === storedOrder.scAddress
          )
      )
    )
  );

// LOCALLY COMPLETED ORDERS

export type LocallyCompletedOrder = {
  id: number;
  limitOrderAddress: string;
  status: 'CLAIMED' | 'CANCELED';
  timestamp: string;
  orderData: any; // Store the full order data for immediate display
};

export const getLocallyCompletedOrders = (
  userAddress: string
): LocallyCompletedOrder[] =>
  JSON.parse(
    localStorage.getItem('locallyCompletedOrders' + userAddress) ?? '[]'
  );

export const setLocallyCompletedOrder = (
  userAddress: string,
  order: LocallyCompletedOrder
) => {
  const existingOrders = getLocallyCompletedOrders(userAddress);
  // Remove existing order with same id if it exists
  const filteredOrders = existingOrders.filter(
    (existingOrder) => existingOrder.id !== order.id
  );
  const updatedOrders = [...filteredOrders, order];

  localStorage.setItem(
    'locallyCompletedOrders' + userAddress,
    JSON.stringify(updatedOrders)
  );
};

export const removeLocallyCompletedOrder = (
  userAddress: string,
  orderId: number
) => {
  const existingOrders = getLocallyCompletedOrders(userAddress);
  const filteredOrders = existingOrders.filter((order) => order.id !== orderId);

  localStorage.setItem(
    'locallyCompletedOrders' + userAddress,
    JSON.stringify(filteredOrders)
  );
};

export const removeLocallyCompletedOrders = (
  userAddress: string,
  orderIds: number[]
) => {
  const existingOrders = getLocallyCompletedOrders(userAddress);
  const filteredOrders = existingOrders.filter(
    (order) => !orderIds.includes(order.id)
  );

  localStorage.setItem(
    'locallyCompletedOrders' + userAddress,
    JSON.stringify(filteredOrders)
  );
};

// OTHER

export const getIsDegenMode = (): boolean =>
  localStorage.getItem('isDegenMode') === 'true';

export const setIsDegenMode = (isDegenMode: boolean) =>
  localStorage.setItem('isDegenMode', String(isDegenMode));

export const getRecentTransactions = (address: string): Transaction[] => {
  const key = `recentTransactions${address}${betaId}`;
  const txs = JSON.parse(localStorage.getItem(key) ?? '[]') as Transaction[];
  return txs.sort((a, b) => b.timestamp - a.timestamp);
};

export const addToRecentTransactions = (tx: Transaction, address: string) => {
  const recentTransactions = getRecentTransactions(address);
  recentTransactions.push(tx);

  localStorage.setItem(
    `recentTransactions${address}${betaId}`,
    JSON.stringify(recentTransactions)
  );

  // window.dispatchEvent(new Event('localStorage'));
};

// RECENT SEND ADDRESSES

export interface RecentSendAddress {
  address: string;
  lastUsed: number;
  label?: string;
}

const MAX_RECENT_ADDRESSES = 8;

export const getRecentSendAddresses = (
  userAddress: string
): RecentSendAddress[] => {
  const key = `recentSendAddresses${userAddress}${betaId}`;
  const addresses = JSON.parse(
    localStorage.getItem(key) ?? '[]'
  ) as RecentSendAddress[];
  return addresses.sort((a, b) => b.lastUsed - a.lastUsed);
};

export const addRecentSendAddress = (
  userAddress: string,
  address: string,
  label?: string
) => {
  if (!address || address === userAddress) return; // Don't save empty or self addresses

  const recentAddresses = getRecentSendAddresses(userAddress);
  const existingIndex = recentAddresses.findIndex(
    (item) => item.address === address
  );

  const addressItem: RecentSendAddress = {
    address,
    lastUsed: Date.now(),
    label
  };

  if (existingIndex !== -1) {
    // Update existing address with new timestamp
    recentAddresses[existingIndex] = addressItem;
  } else {
    // Add new address
    recentAddresses.push(addressItem);

    // Keep only the most recent addresses
    if (recentAddresses.length > MAX_RECENT_ADDRESSES) {
      recentAddresses.sort((a, b) => b.lastUsed - a.lastUsed);
      recentAddresses.splice(MAX_RECENT_ADDRESSES);
    }
  }

  const key = `recentSendAddresses${userAddress}${betaId}`;
  localStorage.setItem(key, JSON.stringify(recentAddresses));
};

export const removeRecentSendAddress = (
  userAddress: string,
  address: string
) => {
  const recentAddresses = getRecentSendAddresses(userAddress);
  const filteredAddresses = recentAddresses.filter(
    (item) => item.address !== address
  );

  const key = `recentSendAddresses${userAddress}${betaId}`;
  localStorage.setItem(key, JSON.stringify(filteredAddresses));
};

export const getClaimedFeesToDonate = (
  address: string,
  pairAddress: string
): {
  amount0: bigint;
  amount1: bigint;
} => {
  const key = `claimedFeesToDonate${address}${pairAddress}${betaId}`;
  const claimedFees = JSON.parse(localStorage.getItem(key) ?? '{}');
  return {
    amount0: BigInt(claimedFees.amount0 ?? 0),
    amount1: BigInt(claimedFees.amount1 ?? 0)
  };
};

export const setClaimedFeesToDonate = (
  address: string,
  pairAddress: string,
  amounts: {
    amount0: bigint;
    amount1: bigint;
  }
) => {
  const key = `claimedFeesToDonate${address}${pairAddress}${betaId}`;
  const claimedFees = {
    amount0: amounts.amount0.toString(),
    amount1: amounts.amount1.toString()
  };
  localStorage.setItem(key, JSON.stringify(claimedFees));
};

// REFERRAL

export const getReferralCode = (): string | null => {
  return localStorage.getItem('referralCode');
};

export const setReferralCode = (code: string) => {
  localStorage.setItem('referralCode', code);
};

export const clearReferralCode = () => {
  localStorage.removeItem('referralCode');
};

export const getReferralTimestamp = (): number | null => {
  const timestamp = localStorage.getItem('referralTimestamp');
  return timestamp ? parseInt(timestamp) : null;
};

export const setReferralTimestamp = (timestamp: number) => {
  localStorage.setItem('referralTimestamp', timestamp.toString());
};

// Check if referral code is still valid (within 30 days)
export const isReferralCodeValid = (): boolean => {
  const timestamp = getReferralTimestamp();
  if (!timestamp) return false;
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp < thirtyDaysInMs;
};

// Get stored referral code if valid, clear if expired
export const getStoredReferralCode = (): string | null => {
  const code = getReferralCode();
  if (code && isReferralCodeValid()) {
    return code;
  }

  // Clear expired referral code
  if (code && !isReferralCodeValid()) {
    clearReferralCode();
  }

  return null;
};

// HELPERS

// for localStorage serialization issues
export const transformToken = (token: Token) =>
  new Token(
    token.chainId,
    token.address,
    token.decimals,
    token.logoURI,
    token.symbol,
    token.name
  );
