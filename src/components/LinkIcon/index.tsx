import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import './index.scss';

const LinkIcon = ({
  link,
  external,
  text
}: {
  link: string;
  external: boolean;
  text?: string;
}) => {
  return (
    <div className='LinkIcon'>
      {external ? (
        <a href={link} target='_blank' rel='noopener noreferrer'>
          {text}
          <FontAwesomeIcon icon={faExternalLink} />
        </a>
      ) : (
        <Link to={link}>{text}</Link>
      )}
    </div>
  );
};

export default LinkIcon;
