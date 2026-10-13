import { useState } from 'react';
import {
  faTelegram,
  faMedium,
  faGithub,
  faDiscord,
  faXTwitter
} from '@fortawesome/free-brands-svg-icons';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Dropdown from 'components/Dropdown';
import { NETWORK } from 'utils/config';
import { currentBlock, ONE_PERIOD } from 'utils/constants';
import { baseClient } from 'utils/w3';
import './index.scss';

const Footer = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const nodeStatusQuery = useQuery(
    ['nodeStatus'],
    () =>
      baseClient.getNodeStatus().catch((err) => {
        console.warn(err);
        toast.error('Could not connect to network');
      }),
    { refetchInterval: ONE_PERIOD * 5 }
  );
  const blockNumber = nodeStatusQuery.data?.nextSlot?.period || currentBlock;

  return (
    <footer className='flex items-center justify-between px-6 py-2'>
      <div className='flex gap-4'>
        {[
          { icon: faXTwitter, link: 'https://twitter.com/dusalabs' },
          { icon: faDiscord, link: 'https://dsc.gg/dusalabs' },
          { icon: faMedium, link: 'https://medium.com/@dusalabs' },
          { icon: faTelegram, link: 'https://t.me/dusacommunity' },
          { icon: faGithub, link: 'https://github.com/dusaprotocol' }
          //{ icon: undefined, link: 'https://forms.gle/aWsSwZSm6pPWcmKr5' }
        ].map((social, index) => {
          return (
            <div key={index}>
              {!social.icon ? (
                <Dropdown
                  isOpen={isDropdownOpen}
                  setIsOpen={setIsDropdownOpen}
                  triggerButton={<span>more</span>}
                  position='top'
                >
                  <div className='mx-2 my-4 flex flex-col text-[0.9rem]'>
                    <div className='flex items-center gap-1'>
                      <a
                        href={social.link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='whitespace-nowrap'
                      >
                        List your token
                      </a>
                      <FontAwesomeIcon
                        icon={faExternalLink}
                        className='text-[0.8rem]'
                      />
                    </div>
                  </div>
                </Dropdown>
              ) : (
                <a
                  href={social.link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='transition-filter filter transition-transform duration-100 ease-out hover:scale-110 hover:brightness-125'
                >
                  <FontAwesomeIcon icon={social.icon} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      {blockNumber && (
        <div className='flex items-center gap-1'>
          <span className='text-[0.75rem] text-[rgb(118,158,173)]'>
            {NETWORK}
          </span>
          <div className='relative h-[34px] w-[34px]'>
            <div className='pulse__ring'></div>
            <div className='pulse__ring'></div>
          </div>
          <span className='text-[0.75rem] text-[rgb(118,158,173)]'>
            {blockNumber}
          </span>
        </div>
      )}
    </footer>
  );
};

export default Footer;
