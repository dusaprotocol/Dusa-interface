import { IS_BUILDNET } from './config';
import {
  DAI,
  DUSA_MAIN,
  FPOM,
  POM,
  PUR,
  USDC,
  USDT,
  WBTC,
  WETH,
  WETH_B,
  WMAS
} from './tokens';
import { Pool, PoolV2WithLO } from './types';

export const pools: Pool[] = [
  {
    //  WMAS - USDC
    token0: WMAS,
    token1: USDC,
    binStep: 20,
    pairAddress: IS_BUILDNET
      ? 'AS112Wdy9pM4fvLNLHQXyf7uam9waMPdG5ekr4vxCyQHPkrMMPPY'
      : 'AS12Q5NyCQUtEBTnnqqBwcGyYb18szbbKv5GArcdk9tm2HitTupHw',
    version: 'V1'
  },
  {
    // WETH - WMAS
    token0: WETH,
    token1: WMAS,
    binStep: 15,
    pairAddress: IS_BUILDNET
      ? 'AS14AxjeYA1K51wwyLexL67atzS75eTCAjUm3GDYTpMeZsarEhp3'
      : 'AS1Ba1T2mMpHvLEhTvsNkSDqm4djno2ezVojGrtLf1wRd8ThfZD3',
    version: 'V1'
  },
  {
    // DAI - USDC
    token0: DAI,
    token1: USDC,
    binStep: 1,
    pairAddress: IS_BUILDNET
      ? 'AS1LedeAXXC2XrzDWrY32NuN8FtJTaAjTf6KB28SuDk5eT5RJPmg'
      : 'AS12QDpZFi8szHCfyNsvB3JWT9dmHbvDx9uSjMLQ8rHVPN67rrG9n',
    version: 'V1'
  },
  {
    // USDT - USDC
    token0: USDT,
    token1: USDC,
    binStep: 1,
    pairAddress: IS_BUILDNET
      ? 'AS12fb8wnbT6JC4Bi2BnKfmxUked2mLAjx3y3yoqzaHsFVZk39eqb'
      : 'AS1F2SAbhvknGLQKzfjaizKiZhEEd6mS1HLpZqPc2atzKE4VTNv9',
    version: 'V1'
  },
  {
    // WETH.b - WETH.e
    token0: WETH_B,
    token1: WETH,
    binStep: 1,
    pairAddress: 'AS1vQsWBLPdJFdAu75Cgh2eAqYp2rvcaurRjSfHjcfirxboLT3mG',
    version: 'V1'
  },
  // WBTC - USDC
  {
    token0: WBTC,
    token1: USDC,
    binStep: 15,
    pairAddress: 'AS12AsqyNwL3WV8oaX6aiaPebZiZKncFg1xunPGRMo4GmY9vVz54J',
    version: 'V1'
  }
];

!IS_BUILDNET &&
  pools.splice(0, 0, {
    // DUSA - WMAS
    token0: DUSA_MAIN,
    token1: WMAS,
    binStep: 20,
    pairAddress: 'AS12c8JYD6aWtXtXHVv2yuGYTdoiexKEaU2MRgywTSR3cNgMbPSKc',
    version: 'V1'
  });
!IS_BUILDNET &&
  pools.splice(6, 0, {
    token0: PUR,
    token1: WMAS,
    binStep: 100,
    pairAddress: 'AS127CXxgeuu6A8UitxJwdnZ3SoXJFzTzEiKTZtaxzmEXXeoE1Wxc',
    version: 'V1'
  });
!IS_BUILDNET &&
  pools.splice(7, 0, {
    token0: PUR,
    token1: USDC,
    binStep: 50,
    pairAddress: 'AS12FWAhf84FELsvBXe8LJEJHTKzfK7PwopsaJRwJshTfcRjQBy1o',
    version: 'V1'
  });
!IS_BUILDNET &&
  pools.splice(8, 0, {
    token0: POM,
    token1: WMAS,
    binStep: 100,
    pairAddress: 'AS12dLJdfrFaTv8yz4v7YEnbUZY386joSi4kcSZseiiFFJt6E7kn',
    version: 'V1'
  });
!IS_BUILDNET &&
  pools.splice(9, 0, {
    token0: FPOM,
    token1: WMAS,
    binStep: 100,
    pairAddress: 'AS1W7taiKULZuqfcy6rZuyZwN5WE51HXoY7cTywqqvi9wuWmPShm',
    version: 'V1'
  });

const WmasUsdc20V2: Pool = {
  // WMAS - USDC V2
  token0: WMAS,
  token1: USDC,
  binStep: 20,
  pairAddress: IS_BUILDNET
    ? 'AS12cVxiDJCuVqvgxPhU9YKvtzSMnEokGniEwPdmK4NNyyucM927F'
    : 'AS1TVRnzkRZCeWW32tEiymnz3ghkRB28ijBPczTM5BjCrKxbazm1',
  version: 'V2'
};
const WethWmas15V2: Pool = {
  // WETH - WMAS V2
  token0: WETH,
  token1: WMAS,
  binStep: 15,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS146g616AcTMnqxP1hL2pt75ui4suY8Fq6mYPHYvCx94WKnfW9Q',
  version: 'V2'
};
const WbtcUsdc15V2: Pool = {
  // WBTC - USDC V2
  token0: WBTC,
  token1: USDC,
  binStep: 15,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS186T6EhKppUa1foy61So9z8ZPgxevZHWRpzBXvhujhsMwSNcAM',
  version: 'V2'
};
const DusaWmas15V2: Pool = {
  // DUSA - WMAS V2
  token0: DUSA_MAIN,
  token1: WMAS,
  binStep: 20,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS1GgHvg6fpaHD2i5JZC5ijEDYzpNFbCE5B3GwFLGJy5KtPLH7Ly',
  version: 'V2'
};

const DaiUsdc1V2: Pool = {
  // DAI - USDC V2
  token0: DAI,
  token1: USDC,
  binStep: 1,
  pairAddress: IS_BUILDNET
    ? 'AS19C2vYCSo5wvY8WXKpmLoHnVmUdNzMG229Qw4hq12eUDghc2aG'
    : 'AS1mEuqfdGoTEneLxCXifS7dckshu714roZcv9nJGk5dVzVoXJSV',
  version: 'V2'
};

const UsdtUsdc1V2: Pool = {
  // USDT - USDC V2
  token0: USDT,
  token1: USDC,
  binStep: 1,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS12FjoDGyUvDGq5E4AdyaJMZ9eT8Kcgxdi5QAkmaX7rvozYBS3XQ',
  version: 'V2'
};

const WetheWethb1V2: Pool = {
  // USDT - USDC V2
  token0: WETH_B,
  token1: WETH,
  binStep: 1,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS12Z25g7rM2ASuNh8TaepyFQ9pvNtLf4ioKQDuer4Ljwza7ifRCK',
  version: 'V2'
};

const FpomWmas100V2: Pool = {
  // USDT - USDC V2
  token0: FPOM,
  token1: WMAS,
  binStep: 100,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS12LVBd1eRUqdh42476VMgWiFTM9vZfLX6hDXQuEMaffXsZFNXij',
  version: 'V2'
};

const PomWmas100V2: Pool = {
  // USDT - USDC V2
  token0: POM,
  token1: WMAS,
  binStep: 100,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS12Yn9aHfLMoavtdb9vXhhpq8qXvDrC2LGWqxPqPwk5VLW6qJcLq',
  version: 'V2'
};

const PurWmas100V2: Pool = {
  // USDT - USDC V2
  token0: PUR,
  token1: WMAS,
  binStep: 100,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS123os7LmfBD6yrXmhJv4ruc9BmPcGfmZbhBE1n7VEeTvynFBDpJ',
  version: 'V2'
};

const PurUsdc50V2: Pool = {
  // USDT - USDC V2
  token0: PUR,
  token1: USDC,
  binStep: 50,
  pairAddress: IS_BUILDNET
    ? ''
    : 'AS12LUx1SYarpu5vRrrMHQE7DX2z4U5We3XFTE54QP7so8h6Gj9DP',
  version: 'V2'
};

// Pools V2 for limit orders support
export const poolsV2: Pool[] = [
  WmasUsdc20V2,
  WethWmas15V2,
  DaiUsdc1V2,
  WbtcUsdc15V2,
  DusaWmas15V2,
  PurWmas100V2,
  PurUsdc50V2,
  PomWmas100V2,
  FpomWmas100V2,
  UsdtUsdc1V2,
  WetheWethb1V2
].filter((pool) => pool.pairAddress !== '' && !IS_BUILDNET);

export const poolsV2WithLO: PoolV2WithLO[] = [
  {
    ...WmasUsdc20V2,
    loSC: 'AS1Gfy1wx7DuPZhbH9N1W9H7q5Sdjn51zMNP6sDpCdozT6F715kP'
  }
  // To add a new pool with limit order support, follow these steps:
  // 1. Uncomment the pool definition above (WethWmas15, DaiUsdc1, etc.)
  // 2. Set the correct pairAddress for your network
  // 3. Add it here with the correct loSC (limit order smart contract address)
  // Example:
  // {
  //   ...WethWmas15,
  //   loSC: 'AS1URSKu6TwouGpJsKcwnc1uEZuQ4xiRQaAJsKpXgZpACCRCGPvB'
  // },
  // {
  //   ...DaiUsdc1,
  //   loSC: 'AS1URSKu6TwouGpJsKcwnc1uEZuQ4xiRQaAJsKpXgZpACCRCGPvB'
  // }
].filter((pool) => pool.pairAddress !== '');
