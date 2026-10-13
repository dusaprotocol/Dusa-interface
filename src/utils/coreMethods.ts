import { SCALE_OFFSET } from './constants';
import { DUSA_MAIN, JELLY, MASSA, WMAS } from './tokens';
import { Token } from './types';

export const getMasIfWmas = (token: Token): Token => {
  if (token.equals(WMAS)) return MASSA;
  return token;
};

export const getWmasIfMas = (token: Token): Token => {
  if (token.equals(MASSA)) return WMAS;
  return token;
};

export const getDusaIfJelly = (token: Token): Token => {
  if (token.equals(JELLY)) return DUSA_MAIN;
  return token;
};

const mulShiftRoundDown = (a: bigint, b: bigint): bigint => {
  return (a * b) >> BigInt(SCALE_OFFSET);
};

export const calculateAmount = (
  accTokenPerShare: bigint,
  balance: bigint,
  debt: bigint
): bigint => mulShiftRoundDown(accTokenPerShare, balance) - debt;
