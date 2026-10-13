import { BrowserProvider } from 'ethers';
import { SALE_CHAIN_ID } from 'utils/configSale';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function getProvider(): BrowserProvider | undefined {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new BrowserProvider(window.ethereum as any);
  }
  return undefined;
}
// Switch MetaMask to Ethereum Mainnet
export async function switchToEthereum(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not detected');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SALE_CHAIN_ID }]
    });
  } catch (err: any) {
    // If the chain hasn’t been added yet, add it
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SALE_CHAIN_ID,
            chainName: 'Ethereum Mainnet',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [
              'https://eth.public-rpc.com',
              'https://ethereum.publicnode.com'
            ],
            blockExplorerUrls: ['https://etherscan.io']
          }
        ]
      });
    } else throw err;
  }
}

// Switch MetaMask to Sepolia Testnet
export async function switchToSepoliaTestnet(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not detected');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SALE_CHAIN_ID }]
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SALE_CHAIN_ID,
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'Sepolia Ether',
              symbol: 'SepoliaETH',
              decimals: 18
            },
            rpcUrls: [
              'https://sepolia.drpc.org',
              'https://ethereum-sepolia-rpc.publicnode.com'
            ],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }
        ]
      });
    } else {
      throw err;
    }
  }
}
