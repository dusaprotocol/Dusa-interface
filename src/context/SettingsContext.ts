import { createContext } from 'react';
import { MCAP } from 'utils/constants';

export const interfaceLevels = ['classic', 'pro'] as const;
export type InterfaceLevel = (typeof interfaceLevels)[number];

export interface SettingsContextType {
  interfaceLevel: InterfaceLevel;
  setInterfaceLevel: (level: InterfaceLevel) => void;
  interfaceTheme: string;
  setInterfaceTheme: (theme: string) => void;
  isOverlay: boolean;
  setIsOverlay: (overlay: boolean) => void;
  swapSlippage: number;
  setSwapSlippage: (slippage: number) => void;
  dcaSlippage: number;
  setDcaSlippage: (slippage: number) => void;
  amountLiquiditySlippage: number;
  setAmountLiquiditySlippage: (slippage: number) => void;
  priceLiquiditySlippage: number;
  setPriceLiquiditySlippage: (slippage: number) => void;
  airdropMcap: number;
  setAirdropMcap: (mcap: number) => void;
  showHeadband: boolean;
  setShowHeadband: (show: boolean) => void;
  simulateTx: boolean;
  setSimulateTx: (simulate: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  interfaceLevel: 'pro',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setInterfaceLevel: () => {},
  interfaceTheme: 'Dusa',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setInterfaceTheme: () => {},
  isOverlay: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setIsOverlay: () => {},
  swapSlippage: 5, // 0.05%, 10000 basis points
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSwapSlippage: () => {},
  dcaSlippage: 30, // 0.5%, 10000 basis points
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDcaSlippage: () => {},
  amountLiquiditySlippage: 50, // 0.5%, 10000 basis points
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setAmountLiquiditySlippage: () => {},
  priceLiquiditySlippage: 50, // 0.5%, 10000 basis points
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setPriceLiquiditySlippage: () => {},
  airdropMcap: MCAP,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setAirdropMcap: () => {},
  showHeadband: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setShowHeadband: () => {},
  simulateTx: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSimulateTx: () => {}
});
