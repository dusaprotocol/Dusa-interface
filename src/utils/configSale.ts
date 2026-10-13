import { ChainId } from '@dusalabs/sdk';
import { CHAIN_ID } from './config';

// Ethereum
export const SALE_CHAIN_ID = {
  [ChainId.BUILDNET]: '0xaa36a7', // Sepolia Testnet
  [ChainId.MAINNET]: '0x1' // Ethereum Mainnet
}[CHAIN_ID];

export const PURCHASE_TOKEN_CONTRACT_ADDRESS = {
  [ChainId.BUILDNET]: '0xa4D6FdE6f8F6f873BB00d5059541B657468E6179', // Ethereum Testnet USDC
  [ChainId.MAINNET]: '0x' // Ethereum
}[CHAIN_ID];

export const SALE_SC_ADDRESSES_Ethereum = {
  0: {
    [ChainId.BUILDNET]: '0x8c0Be5343B4561F36aDe6F287ee06C84677AAfF9', // the SC is also a token
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID],
  1: {
    [ChainId.BUILDNET]: '0x8DCe62d84a3Fa77361002FD91D8424838181cfE2',
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID],
  2: {
    [ChainId.BUILDNET]: '0x2c053b0f63437B51E12523CA02A8Efc8a733CdAd',
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID]
};

//MASSA
export const DUSA_LOCKED_TOKENS_MASSA = {
  0: {
    [ChainId.BUILDNET]: 'AS12BAGvcSpBE6FiB4CoRs3RK6n824TewvDtJ8x8uS2Z5vm9Spsha',
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID],
  1: {
    [ChainId.BUILDNET]: 'AS12sKK9ukYqh6q29s2vqUsse2pZ2icrsPuLmVBtzUPPFUzGjWGPf',
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID],
  2: {
    [ChainId.BUILDNET]: 'AS12RywEAfGKE6rs1e7cMDF8irpEseTAoSAQ8wQEGuCtAbcYN6o9q',
    [ChainId.MAINNET]: '0x'
  }[CHAIN_ID]
};

export const SALE_TOKEN_SC_ADDRESSES_MASSA = {
  0: {
    USDC: {
      [ChainId.BUILDNET]:
        'AS129nCCmqP4AuPhu31W4BAowx1HrTwsJK9BY994PGtMw3D7nErh',
      [ChainId.MAINNET]: ''
    }[CHAIN_ID]
  },
  1: {
    USDC: {
      [ChainId.BUILDNET]:
        'AS1ADzrYWZ2VRBtcVHvo6pumRpvR87F276c35cgsRQSxeeZEqy1j',
      [ChainId.MAINNET]: ''
    }[CHAIN_ID],
    MAS: {
      [ChainId.BUILDNET]:
        'AS12LEErf3mLMwU3yeqGhqK2EMu66h61A2vVKyCnNK1fSZMc47UgZ',
      [ChainId.MAINNET]: ''
    }[CHAIN_ID]
  },
  2: {
    USDC: {
      [ChainId.BUILDNET]:
        'AS1jUQUuUKimJSgxdcssUgs1F97kNJgYPbw4cxtr9EGEqpzF4hQt',
      [ChainId.MAINNET]: ''
    }[CHAIN_ID],
    MAS: {
      [ChainId.BUILDNET]:
        'AS12bwop8PTFBhAQjmEdnDP7H6pRv69nApi9ZWZiSqkS3gM3rTgEN',
      [ChainId.MAINNET]: ''
    }[CHAIN_ID]
  }
};
