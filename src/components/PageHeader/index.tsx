import { routeNames } from 'routes';
import './index.scss';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title?: string;
  description?: string;
  backTo?: [keyof typeof routeNames][0];
  children?: React.ReactNode;
}

const PageHeader = ({
  title,
  description,
  backTo,
  children
}: PageHeaderProps) => {
  return (
    <div className='headline'>
      <div className='header-infos'>
        <div className='title-header-infos'>
          {backTo && (
            <div className='back-to'>
              <Link to={routeNames[backTo]}>
                ← Back to{' '}
                {backTo === 'governance'
                  ? 'proposals'
                  : backTo.replace('/', '')}{' '}
                page
              </Link>
            </div>
          )}
          {title && <h2>{title}</h2>}
          {description && <span className='infos-title'>{description}</span>}
          {children && <div className='header-children'>{children}</div>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
