import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Spinner from 'components/Spinner';
import { DiscordUser as DiscordUserType } from 'utils/trpc';
import { Role } from 'utils/types';
import './index.scss';

interface DiscordUserProps {
  user: DiscordUserType;
  roles: Role[];
}

const DiscordUser = ({ user, roles }: DiscordUserProps) => {
  if (!user) return <Spinner />;
  const avatarHash = user.avatar;
  const isAnimated = avatarHash?.startsWith('a_');
  const avatarExtension = isAnimated ? 'gif' : 'png';
  const role = roles.sort((a, b) => (a.boost > b.boost ? -1 : 1))[0];
  return (
    <div className='DiscordUser'>
      <div className='user'>
        {avatarHash ? (
          <img
            src={`https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.${avatarExtension}`}
            alt='avatar'
            className='avatar'
          />
        ) : (
          <FontAwesomeIcon icon={faDiscord} className='avatar' />
        )}
        <div className='names'>
          <span className='global'>{user.global_name}</span>
          <span className='username'>{user.username}</span>
        </div>
      </div>
      {role && (
        <div className='role'>
          <span className='role-name'>{role.name}</span>
          <span className='role-boost'>JELLY boost x{1 + role.boost}</span>
        </div>
      )}
    </div>
  );
};

export default DiscordUser;
