import './index.scss';

interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox = ({ checked, onChange }: CheckboxProps) => {
  return (
    <input
      className='Checkbox'
      type='checkbox'
      onChange={() => onChange && onChange(!checked)}
      checked={checked}
    />
  );
};

export default Checkbox;
