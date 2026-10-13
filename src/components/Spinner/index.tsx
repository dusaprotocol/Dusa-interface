import { SpinnerCircular } from 'spinners-react';
import './index.scss';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const Spinner = ({ size = 50, ...props }: SpinnerProps) => {
  return (
    <div className='Spinner' {...props}>
      <SpinnerCircular
        color='#eee'
        secondaryColor='transparent'
        size={size}
        speed={150}
      />
    </div>
  );
};

export default Spinner;
