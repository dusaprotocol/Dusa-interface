import React, { useState } from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect, afterEach } from 'vitest';
import NumberInput from './NumberInput';

const user = userEvent.setup();

const InputWrapper = ({ qty = undefined }: { qty?: string }) => {
  const [quantity, setQuantity] = useState<string | undefined>(qty);

  return (
    <NumberInput
      headerText='From'
      token={undefined}
      balance={0n}
      quantity={quantity}
      changeQuantity={setQuantity}
    />
  );
};

afterEach(cleanup);

test('user enters 0', async () => {
  const { getByPlaceholderText } = render(<InputWrapper />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  const value = '0';
  await user.type(input, value);
  expect(input.value).toStrictEqual(value);
});

test('user enters 1', async () => {
  const { getByPlaceholderText } = render(<InputWrapper />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  const value = '1';
  await user.type(input, value);
  expect(input.value).toStrictEqual(value);
});

test('user enters 0.1', async () => {
  const { getByPlaceholderText } = render(<InputWrapper />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  const value = '0.1';
  await user.type(input, value);
  expect(input.value).toStrictEqual(value);
});

test('user enters 2.111', async () => {
  const { getByPlaceholderText } = render(<InputWrapper />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  const value = '2.111';
  await user.type(input, value);
  expect(input.value).toStrictEqual(value);
});

test('user enters 2.01', async () => {
  const { getByPlaceholderText } = render(<InputWrapper />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  const value = '2.01';
  await user.type(input, value);
  expect(input.value).toStrictEqual(value);
});

test('balance is 0.123456789 (token w/ 9 decimals)', async () => {
  const value = '0.123456789';
  const { getByPlaceholderText } = render(<InputWrapper qty={value} />);
  const input = getByPlaceholderText('0.0') as HTMLInputElement;
  expect(input.value).toStrictEqual(value);
});
