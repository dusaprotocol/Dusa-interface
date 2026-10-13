import {
  faDiscord,
  faGithub,
  faMedium,
  faTelegram,
  faXTwitter
} from '@fortawesome/free-brands-svg-icons';
import { faChain } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SaleDetailSection from './SaleDetailSection';

const networks = [
  {
    name: 'Website',
    url: 'https://dusa.io',
    icon: faChain
  },
  {
    name: 'Discord',
    url: 'https://discord.com/invite/x4r55s6SEc',
    icon: faDiscord
  },
  {
    name: 'X',
    url: 'https://x.com/DusaLabs',
    icon: faXTwitter
  },
  {
    name: 'Telegram',
    url: 'https://t.me/dusacommunity',
    icon: faTelegram
  },
  {
    name: 'Medium',
    url: 'https://medium.com/@dusalabs',
    icon: faMedium
  },
  {
    name: 'Github',
    url: 'https:/github.com/dusaprotocol',
    icon: faGithub
  }
];

const CommunityLinks = () => {
  return (
    <SaleDetailSection title='Community Links'>
      <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3'>
        {networks.map((network, index) => {
          return (
            <a
              key={index}
              href={network.url}
              target='_blank'
              rel='noreferrer'
              className='relative flex items-center gap-8 rounded-md border border-[var(--secondary-color)] p-6 text-xl transition-colors hover:bg-[var(--secondary-color)]'
            >
              <FontAwesomeIcon
                icon={network.icon}
                className='absolute text-2xl'
              />
              <span className='w-full text-center'>{network.name}</span>
            </a>
          );
        })}
      </div>
    </SaleDetailSection>
  );
};

export default CommunityLinks;
