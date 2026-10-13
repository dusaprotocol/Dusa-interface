import {
  ChainId,
  DCA_MANAGER_ADDRESS,
  DCA_MANAGER_ADDRESS_V2,
  LB_FACTORY_ADDRESS,
  LB_QUOTER_ADDRESS,
  LB_ROUTER_ADDRESS,
  MULTICALL_ADDRESS,
  V2_LB_FACTORY_ADDRESS,
  V2_LB_QUOTER_ADDRESS,
  V2_LB_QUOTER_ADDRESS_FOR_DCA,
  V2_LB_ROUTER_ADDRESS
  // VAULT_MANAGER_ADDRESS
} from '@dusalabs/sdk';
import {
  GrpcApiUrl,
  CHAIN_ID as MASSA_CHAIN_ID_ENUM
} from '@massalabs/massa-web3';

const getEnvVar = (key: string, defaultValue?: string) => {
  const val = import.meta.env[key];
  if (val === undefined && !defaultValue)
    throw new Error(`Missing env variable: ${key}`);
  return val ?? defaultValue; // will return val if its an empty string (testing purposes)
};

const getEnvVarBool = (key: string, defaultValue?: boolean) =>
  getEnvVar(key, defaultValue ? 'true' : 'false') === 'true';

// export const api = `${window.location.protocol}//${window.location.hostname}:3001/trpc`;
export const api = getEnvVar('VITE_API');
export const apiBackup = getEnvVar('VITE_API_BACKUP', '');
export const baseApi = api.replace('/trpc', '');
export const baseApiBackup = apiBackup.replace('/trpc', '');
export const datastoreApi = getEnvVar('VITE_DATASTORE_API');

export const NETWORK = getEnvVar('VITE_NETWORK_NAME');
export const CHAIN_ID = getEnvVar('VITE_CHAIN_ID') as any as ChainId;
export const CHAIN_URL = getEnvVar('VITE_CHAIN_URL');
export const IS_BUILDNET = Number(CHAIN_ID) === ChainId.BUILDNET;
export const MASSA_CHAIN_ID = IS_BUILDNET
  ? MASSA_CHAIN_ID_ENUM.Buildnet
  : MASSA_CHAIN_ID_ENUM.Mainnet;
export const GRPC_URL = getEnvVar(
  'VITE_GRPC_URL',
  IS_BUILDNET ? GrpcApiUrl.Buildnet : GrpcApiUrl.Mainnet
);

export const DUSA_NODE_URL = getEnvVar('VITE_DUSA_NODE_URL', CHAIN_URL); // used only for the sale

export const FEATURE_FLAGS = {
  ALL_POINTS_DETAILS: getEnvVarBool('VITE_ENABLE_ALL_POINTS_DETAILS', true),
  AUTONOMOUS_LIQUIDITY: getEnvVarBool('VITE_ENABLE_AUTONOMOUS', false),
  CEDESTORE: getEnvVarBool('VITE_ENABLE_CEDESTORE', false),
  COPY_DISTRIBUTION: getEnvVarBool('VITE_ENABLE_COPY_DISTRIBUTION', false),
  CORE_V2: getEnvVarBool('VITE_ENABLE_CORE_V2', false),
  CREATE_POOL: getEnvVarBool('VITE_ENABLE_CREATE_POOL', true),
  DCA: getEnvVarBool('VITE_ENABLE_DCA', false),
  DEGEN_MODE: getEnvVarBool('VITE_ENABLE_DEGEN_MODE', true),
  DISABLE_V1_DEPOSIT: getEnvVarBool('VITE_DISABLE_V1_DEPOSIT', false),
  FAUCET: getEnvVarBool('VITE_ENABLE_FAUCET', false),
  GOVERNANCE: getEnvVarBool('VITE_ENABLE_PUBLIC_GOVERNANCE', false),
  GOVERNANCE_V2: getEnvVarBool('VITE_ENABLE_GOVERNANCE_V2', true),
  HEADBAND: getEnvVarBool('VITE_ENABLE_HEADBAND', false),
  LIMIT: getEnvVarBool('VITE_ENABLE_LIMIT', false),
  MIGRATE_SCRIPT: getEnvVarBool('VITE_ENABLE_MIGRATE_SCRIPT', false),
  PAUSE_SCREEN: getEnvVarBool('VITE_ENABLE_PAUSE_SCREEN', false),
  POINTS: getEnvVarBool('VITE_ENABLE_POINTS', true),
  POINTS_V2: getEnvVarBool('VITE_ENABLE_POINTS_V2', true),
  REWARDS: getEnvVarBool('VITE_ENABLE_REWARDS', true),
  SALE: getEnvVarBool('VITE_ENABLE_SALE', false),
  SENTRY: getEnvVarBool('VITE_ENABLE_SENTRY', false),
  STREAK: getEnvVarBool('VITE_ENABLE_STREAK', true),
  TXS_FROM_DB: getEnvVarBool('VITE_ENABLE_TXS_FROM_DB', true),
  TOKEN_PLEDGE: getEnvVarBool('VITE_ENABLE_TOKEN_PLEDGE', false),
  VESTER: getEnvVarBool('VITE_ENABLE_VESTER', false),
  FLOOR: getEnvVarBool('VITE_ENABLE_FLOOR', false)
};

export const factoryV0SC =
  'AS1f9vUWC2mm4QFVsLpM1XeaWdtUKofGacDJZjJDGrgNogwWpFbh';
export const factorySC = LB_FACTORY_ADDRESS[CHAIN_ID];
export const factoryV2SC = V2_LB_FACTORY_ADDRESS[CHAIN_ID];

export const routerV0SC =
  'AS1bCBYc1sbWBgDs68Cfv89xtLSyH93Yd3RjBJzqq5QYEH4iaDRJ';
export const routerSC = LB_ROUTER_ADDRESS[CHAIN_ID];
export const routerV2SC = V2_LB_ROUTER_ADDRESS[CHAIN_ID];

export const quoterSC = LB_QUOTER_ADDRESS[CHAIN_ID];
export const quoterV2SC = V2_LB_QUOTER_ADDRESS[CHAIN_ID];
export const quoterV2DCASC = V2_LB_QUOTER_ADDRESS_FOR_DCA[CHAIN_ID];

export const vaultManagerSC =
  'AS1tMptxuET37W2uNdi8msiMbR6HW1A9VvUffUG1E8UCT38yzAYp'; // VAULT_MANAGER_ADDRESS[CHAIN_ID];
export const dcaManagerSC = DCA_MANAGER_ADDRESS[CHAIN_ID];
export const dcaManagerSCV2 = DCA_MANAGER_ADDRESS_V2[CHAIN_ID];

export const faucetSC = 'AS1JZHjFZ8fQ8xsoS94rAdxqHU8FuGTBkmPRXdvDm9dtb6jGhkhb';
export const multicallSC = MULTICALL_ADDRESS[CHAIN_ID];

export const tokenSC = 'AS12HT1JQUne9nkHevS9Q7HcsoAaYLXWPNgoWPuruV7Gw6Mb92ACL';
export const votingEscrowSC = IS_BUILDNET
  ? 'AS1LXretgtJ2Dgr6rbXVZKLufonanX6j3JgutWDeQkyZtfgLgTqu'
  : 'AS1q76iSMJ8Dj5gVBVK26y11yuFi9eVzUmTzwf5ANgoypMVcNjXj';
export const voterSC = IS_BUILDNET
  ? 'AS1hXM7MsS8kepqgqmaQganVRCAjYTFqBpNDMqp4NBd6YBWXEHA2'
  : 'AS1rg37d1cFXrSXbEaKbGPBKRXahshk6VgvwJXjg48MbyuwM1ea6';
export const governanceSC = IS_BUILDNET
  ? 'AS122yqNAr1Xrb9PeA1VqFGzqVD18wFwBVARm1JjhpsDBBjqWXusV'
  : 'AS1dX2DyCSBRPZU1CTaZbqfnYw9HswrB5rBgJgW14JyB4SfewxoP';
export const rewarderSC = IS_BUILDNET
  ? 'AS12Z3dcHq2hfMDRfC3q9zmAfW1mqcbLnwZxUm68DovC49iU2Lvhf' // Buildnet
  : 'AS1kvD1VnfKGVfztHQgC45TcwDbtrD8g7r8JHTxpSjzWpfDnP4T3'; // Mainnet (contrat pour les rewards en jelly)
export const scriptSC = 'AS1oMcGodnCPxp9Ck4yTv1MHkHS9xWzrGmqMcbKu9Vc6qWs2Pigd';
export const liquidityHelperSC = IS_BUILDNET
  ? 'AS122AdgHNoYpZsfnnRRWLY5NbNquXyV6WCesZsjnFSZB6fJ1CV99'
  : 'AS12FQ7ErCRw2axbXyg1PcWgxhAA7RKz9Tx6neu2rpCt6FZWxs18k';
export const migrateSC = '';

export const VESTING_SC_ADDRESS = {
  [ChainId.BUILDNET]: 'AS1d9HsWPpSv7reywREfu9rCYMJZENFNC3TzLYvX5TQ9RCPscMAL', // buildnet
  [ChainId.MAINNET]: 'AS12fgnFfweZ8Qrwsry9k6Stdv2PZDH5hCEsK9ZMMRt1yduUZ4mD8' // mainnet
}[CHAIN_ID];

export const STAKING_SC_ADDRESS = {
  [ChainId.BUILDNET]: 'AS12iDeyU5ZHjEqCJfW18qTe1HyYLnKtAJx2RutcydsWC1oFk791K', // buildnet
  [ChainId.MAINNET]: 'AS1DADmvUTWcm36enMD643xMqiJKCbhmHWuDsy1mZkd1LmuqEetF' // mainnet
}[CHAIN_ID];

export const EXPLORER =
  NETWORK === 'mainnet'
    ? 'https://explorer.massa.net/mainnet'
    : 'https://massexplo.massahub.network';
export const MAS_SUPPLY_ENDPOINT =
  'https://stats.massa.foundation/grs/api.dws?q=totalcoins';

export const DISCORD_CLIENT_ID = getEnvVar('VITE_DISCORD_CLIENT_ID');

export const storageThemeVersion = '2';
export const actualTheme = 'Dusa';
