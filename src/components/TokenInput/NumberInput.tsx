import { blockInvalidChar, unFormatPrintedNumber } from 'utils/methods';
import { TokenInputProps } from '.';

const NumberInput = (props: TokenInputProps) => {
  const { quantity, changeQuantity, disabled, className, placeholder } = props;
  const q = quantity ? unFormatPrintedNumber(quantity) : undefined;
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    changeQuantity(val);
  };

  return (
    <input
      type='number'
      inputMode='decimal'
      autoComplete='off'
      autoCorrect='off'
      placeholder={placeholder ?? (disabled ? '--' : '0.0')}
      step='any'
      min={0}
      value={q !== undefined && !isNaN(parseFloat(q)) && !disabled ? q : ''}
      disabled={disabled}
      onChange={handleInputChange}
      onKeyDown={blockInvalidChar}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      className={className}
    />
  );
};

export default NumberInput;
