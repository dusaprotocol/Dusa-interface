import { faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
  isDisabled?: boolean;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepClick?: (stepIndex: number) => void;
}

const WizardStepper = ({
  steps,
  currentStepIndex,
  onStepClick
}: WizardStepperProps) => {
  return (
    <div className='WizardStepper'>
      <div className='wizard-steps'>
        {steps.map((step, index) => (
          <div key={step.id} className='wizard-step-container'>
            <div
              className={`wizard-step ${step.isComplete ? 'completed' : ''} ${
                step.isActive ? 'active' : ''
              } ${step.isDisabled ? 'disabled' : ''}`}
              onClick={() => !step.isDisabled && onStepClick?.(index)}
            >
              <div className='step-indicator'>
                {step.isComplete ? (
                  <FontAwesomeIcon icon={faCheck} />
                ) : (
                  <span className='step-number'>{index + 1}</span>
                )}
              </div>
              <div className='step-content'>
                <div className='step-title'>{step.title}</div>
                <div className='step-description'>{step.description}</div>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className='step-separator'>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WizardStepper;
