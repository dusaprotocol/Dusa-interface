import clsx from 'clsx/lite';
import './index.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = (props: Omit<InputProps, 'type' | 'inputMode' | 'step'>) => {
  return (
    <div className='Input-wrapper'>
      <input
        className='Input'
        type='number'
        inputMode='decimal'
        step='any'
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        {...props}
      />
      {props.label && (
        <label
          className={clsx('Input-label', props.disabled && 'disabled-label')}
        >
          {props.label}
        </label>
      )}
    </div>
  );
};

export default Input;
