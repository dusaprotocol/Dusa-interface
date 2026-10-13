import { faWarning, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Spinner from '../Spinner';

interface InfoProps {
  isLoading?: boolean;
  icon?: IconDefinition;
  children?: JSX.Element;
  className?: string;
  onClick?: () => void;
}

const Info = ({ isLoading, icon, children, className, onClick }: InfoProps) => {
  return (
    <div
      className={clsx(
        'flex items-center px-4 py-2 text-sm rounded-lg bg-[var(--hover-bg)] text-[var(--second-color)]',
        className,
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {isLoading && <Spinner size={20} className='mr-2' />}
      {icon && <FontAwesomeIcon icon={icon} className='mr-2' />}
      {children}
    </div>
  );
};

export default Info;

interface SimpleInfoProps {
  text: string;
  isLoading?: boolean;
  icon?: IconDefinition;
}

export const SimpleInfo = ({ text, isLoading, icon }: SimpleInfoProps) => {
  return (
    <Info isLoading={isLoading} icon={icon}>
      <span>{text}</span>
    </Info>
  );
};

type WarningProps =
  | {
      text: string;
    }
  | {
      children: React.ReactNode;
    };

export const Warning = (props: WarningProps) => {
  if ('text' in props) return <SimpleInfo text={props.text} icon={faWarning} />;

  return (
    <Info>
      <>{props.children}</>
    </Info>
  );
};
