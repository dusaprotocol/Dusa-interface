import { parseUnits } from '@dusalabs/sdk';
import { bytesToStr } from '@massalabs/massa-web3';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { describe, it, expect } from 'vitest';
import { currentEpoch } from './constants';
import {
  calculateRewardAPR,
  changeQuantityWithFixedPriceRaw,
  createKey,
  DELIMITER,
  filterPools,
  formatNumberWithSubscriptZeros,
  isAddressValid,
  printBigintIsh,
  shortenDate,
  toFraction,
  u256ToString,
  u8ArrayToString
} from './methods';
import { pools } from './pools';
import { MASSA, USDC, WMAS, tokens } from './tokens';
dayjs.extend(relativeTime);

describe('printBigintIsh', () => {
  it('should print correctly', () => {
    const x = printBigintIsh(USDC, parseUnits('1234.56', USDC.decimals));
    expect(x).toBe('1,234.56');
  });
  it('should print correctly', () => {
    const x = printBigintIsh(USDC, parseUnits('0.0001234', USDC.decimals));
    expect(x).toBe('0.00012');
  });
  it('should print correctly', () => {
    const x = printBigintIsh(
      USDC,
      parseUnits('123456789.123456', USDC.decimals)
    );
    expect(x).toBe('123,456,789.12');
  });
  it('should print correctly', () => {
    const x = printBigintIsh(USDC, parseUnits('0.12', USDC.decimals));
    expect(x).toBe('0.12');
  });
  it('should print correctly', () => {
    const x = printBigintIsh(USDC, parseUnits('12.34', USDC.decimals));
    expect(x).toBe('12.34');
  });
});
describe('calculateRewardAPR', () => {
  it('should return 0', () => {
    const apr = calculateRewardAPR(
      [
        {
          amount: parseUnits('8400', 9).toString(),
          address: '',
          dollarValue: 5,
          token: WMAS,
          rewardPoolAddress: '',
          rewardEpoch: 1
        }
      ],
      currentEpoch,
      275_000
    );
    expect(apr).toBeGreaterThan(100);
  });
});
describe('formatNumberWithSubscriptZeros', () => {
  it('should handle zero correctly', () => {
    expect(formatNumberWithSubscriptZeros('0')).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros(0)).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros('0.00000')).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros('0.0')).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros('-0')).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros('-0.000')).toStrictEqual('0');
  });

  it('should handle small numbers less than min threshold', () => {
    expect(formatNumberWithSubscriptZeros('0.000001')).toStrictEqual('0.0₅1');
    expect(formatNumberWithSubscriptZeros(0.00000001)).toStrictEqual('0.0₇1');
    expect(formatNumberWithSubscriptZeros('-0.0000001')).toStrictEqual(
      '-0.0₆1'
    );
    expect(
      formatNumberWithSubscriptZeros('7.745769240687417e-8')
    ).toStrictEqual('0.0₇774');
    expect(formatNumberWithSubscriptZeros('9.0000090000e-8')).toStrictEqual(
      '0.0₇9'
    );
  });

  it('should handle numbers just above the min threshold', () => {
    expect(formatNumberWithSubscriptZeros('0.0014923')).toStrictEqual(
      '0.00149'
    );
    expect(formatNumberWithSubscriptZeros('-0.0014923')).toStrictEqual(
      '-0.00149'
    );
    expect(formatNumberWithSubscriptZeros(0.00000999)).toStrictEqual('0.0₅999');
  });

  it('should handle numbers with leading zeros in decimal part', () => {
    expect(formatNumberWithSubscriptZeros('2.0000000000')).toStrictEqual('2');
    expect(formatNumberWithSubscriptZeros('2.0000000100')).toStrictEqual(
      '2.0₇1'
    );
    expect(formatNumberWithSubscriptZeros('-2.000001')).toStrictEqual('-2.0₅1');
    expect(formatNumberWithSubscriptZeros(3.0000003)).toStrictEqual('3.0₆3');
  });

  it('should handle large numbers', () => {
    expect(formatNumberWithSubscriptZeros('123456789.123456789')).toStrictEqual(
      '123456789.123'
    );
    expect(
      formatNumberWithSubscriptZeros('-987654321.987654321')
    ).toStrictEqual('-987654321.987');
    expect(formatNumberWithSubscriptZeros('1e+8')).toStrictEqual('100000000');
    expect(formatNumberWithSubscriptZeros('-1e+8')).toStrictEqual('-100000000');
  });

  it('should handle numbers in exponential notation', () => {
    expect(formatNumberWithSubscriptZeros('1e-5')).toStrictEqual('0.0₄1');
    expect(formatNumberWithSubscriptZeros('-1e-6')).toStrictEqual('-0.0₅1');
    expect(formatNumberWithSubscriptZeros('1.23e-5')).toStrictEqual('0.0₄123');
    expect(formatNumberWithSubscriptZeros('-9.87e-7')).toStrictEqual(
      '-0.0₆987'
    );
  });

  it('should handle negative numbers correctly', () => {
    expect(formatNumberWithSubscriptZeros('-0.01')).toStrictEqual('-0.01');
    expect(formatNumberWithSubscriptZeros('-0.000001')).toStrictEqual('-0.0₅1');
    expect(formatNumberWithSubscriptZeros('-2.0000000100')).toStrictEqual(
      '-2.0₇1'
    );
    expect(formatNumberWithSubscriptZeros('-0.00000001')).toStrictEqual(
      '-0.0₇1'
    );
  });

  it('should handle numbers with no fractional part', () => {
    expect(formatNumberWithSubscriptZeros('100')).toStrictEqual('100');
    expect(formatNumberWithSubscriptZeros('-50')).toStrictEqual('-50');
    expect(formatNumberWithSubscriptZeros('0.')).toStrictEqual('0');
    expect(formatNumberWithSubscriptZeros('-0.')).toStrictEqual('0');
  });

  it('should handle numbers with trailing zeros in fractional part', () => {
    expect(formatNumberWithSubscriptZeros('1.23000')).toStrictEqual('1.23');
    expect(formatNumberWithSubscriptZeros('1.00000')).toStrictEqual('1');
    expect(formatNumberWithSubscriptZeros('-5.60000')).toStrictEqual('-5.6');
    expect(formatNumberWithSubscriptZeros('0.1000')).toStrictEqual('0.1');
  });

  it('should handle custom precision', () => {
    expect(formatNumberWithSubscriptZeros('0.0000012345', 5)).toStrictEqual(
      '0.0₅12345'
    );
    expect(formatNumberWithSubscriptZeros('0.0000012345', 2)).toStrictEqual(
      '0.0₅12'
    );
    expect(formatNumberWithSubscriptZeros('0.0123456', 4)).toStrictEqual(
      '0.01234'
    );
    expect(formatNumberWithSubscriptZeros('-0.0000009876', 3)).toStrictEqual(
      '-0.0₆987'
    );
  });
});
describe('changeQuantityWithFixedPriceRaw', () => {
  it('', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      '1',
      true,
      toFraction(0.0002),
      WMAS,
      USDC
    );
    expect(Number(qty0)).toBeCloseTo(1);
    expect(Number(qty1)).toBeCloseTo(0.2);
  });
  it('', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      '1',
      false,
      toFraction(0.0002),
      WMAS,
      USDC
    );
    expect(Number(qty0)).toBeCloseTo(5, 1);
    expect(Number(qty1)).toBeCloseTo(1, 1);
  });

  it('should handle zero quantity', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      '0',
      true,
      toFraction(0.0002),
      WMAS,
      USDC
    );
    expect(qty0).toBe('0');
    expect(qty1).toBe('');
  });

  it('should handle undefined quantity', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      undefined,
      true,
      toFraction(0.0002),
      WMAS,
      USDC
    );
    expect(qty0).toBe('');
    expect(qty1).toBe('');
  });

  it('should handle undefined tokens', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      '1',
      true,
      toFraction(0.0002),
      undefined,
      USDC
    );
    expect(qty0).toBe('1');
    expect(qty1).toBe('');
  });

  it('should handle zero price', () => {
    const { qty0, qty1 } = changeQuantityWithFixedPriceRaw(
      '1',
      true,
      toFraction(0),
      WMAS,
      USDC
    );
    expect(qty0).toBe('1');
    expect(qty1).toBe('');
  });
});
describe('isAddressValid', () => {
  const _tokens = [...tokens].filter((t) => t.address !== MASSA.address);
  _tokens.forEach((token) => {
    it(`should return true for ${token.symbol}`, () => {
      expect(isAddressValid(token.address)).toBe(true);
    });
  });

  it('should return false for invalid address', () => {
    expect(isAddressValid('')).toBe(false);
    expect(isAddressValid(WMAS.address.slice(-1))).toBe(false);
  });
});
describe('filterPools', () => {
  // const printPools = (pools: Pool[]) =>
  //   pools.map((pool) => pool.token0.symbol + ' : ' + pool.token1.symbol);
  it('should work w/ one symbol', () => {
    const search = 'USDC';
    const filtered = filterPools(search, pools);
    const hasUsdc = (pool: (typeof pools)[number]) =>
      [pool.token0, pool.token1].some((t) =>
        t.symbol.toLowerCase().includes('usdc')
      );

    // every USDC pool, and only those (the pool list grows over time)
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(hasUsdc)).toBe(true);
    expect(filtered.length).toBe(pools.filter(hasUsdc).length);
  });
  it('should work w/ two symbols', () => {
    const search = 'USDC WMAS';
    const filtered = filterPools(search, pools);

    expect(filtered.length).toBe(1);
  });
  it('should work w/ symbol substring', () => {
    const search = 'WE';
    const filtered = filterPools(search, pools);

    expect(filtered.length).toBeGreaterThan(1);
  });
  it('should work w/ MAS', () => {
    const search = 'MAS';
    const filtered = filterPools(search, pools);

    expect(filtered.length).toBeGreaterThan(0);
  });
  // it('should not return MAS pools w/ `W`', () => {
  //   const search = 'W';
  //   const filtered = filterPools(search, pools);

  //   console.log(printPools(filtered));
  //   expect(filtered.length).not.toEqual(pools.length);
  // });
});
describe('shortenDate', () => {
  it('should work', () => {
    // fixed reference date, so the result doesn't change over time
    const start = dayjs(new Date(1));
    expect(shortenDate(start.from(start.add(55, 'year')))).toBe('55y');
    expect(shortenDate(start.from(start.add(3, 'day')))).toBe('3d');
  });
});
describe('misc', () => {
  it('u8ArrayToString', () => {
    const arr = Uint8Array.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(u8ArrayToString(arr)).toEqual(bytesToStr(arr));
  });
  it('createKey', () => {
    const key = createKey('AS1', 'AU1', 25);
    expect(key).toEqual(`AS1${DELIMITER}AU1${DELIMITER}25`);
  });
});
describe('u256ToString', () => {
  it('should work', () => {
    expect(u256ToString(0n)).toStrictEqual(
      '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    );
  });
});
