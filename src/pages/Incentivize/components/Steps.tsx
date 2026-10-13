import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';

type Step = {
  text: string;
  icon: IconDefinition;
};
interface StepsProps {
  steps: string[] | Step[];
}

const Steps = ({ steps }: StepsProps) => {
  return (
    <div className='flex w-full flex-col gap-2'>
      {steps.map((step, i) => {
        if (typeof step === 'string') {
          return (
            <div key={i} className='flex gap-2'>
              <span className='number'>{i + 1}.</span>
              <span className='break-all'>{step}</span>
            </div>
          );
        }
        return (
          <div key={i} className='step'>
            <span className='number'>{i + 1}.</span>
            <span className='break-all'>{step.text}</span>
            <FontAwesomeIcon icon={step.icon} />
          </div>
        );
      })}
    </div>
  );
};

export default Steps;
