export const getCoinMarketCapUrl = (symbol: string) => {
  switch (symbol) {
    case 'WMAS':
      return 'https://coinmarketcap.com/currencies/massa/';
    case 'USDC.e':
      return 'https://coinmarketcap.com/fr/currencies/usd-coin-bridged-usdc-e/';
    case 'USDT.b':
      return 'https://coinmarketcap.com/fr/currencies/tether/';
    case 'DAI.e':
      return 'https://coinmarketcap.com/fr/currencies/multi-collateral-dai/';
    case 'WETH.e':
    case 'WETH.b':
      return 'https://coinmarketcap.com/fr/currencies/weth/';
    case 'WBTC.e':
      return 'https://coinmarketcap.com/currencies/bitcoin/';
    default:
      return 'Purrfect Universe';
  }
};
