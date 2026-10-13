import { useContext, useState } from 'react';
import { faEllipsis, faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo_halloween from 'assets/img/logo_halloween.png';
import logo_white from 'assets/img/logo_white.png';
import logo_winter from 'assets/img/logo_winter.png';
import Dropdown from 'components/Dropdown';
import GlobalSettings from 'components/GlobalSettings';
import WalletConnect from 'components/WalletConnect';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import useResizeWindow from 'hooks/useResizeWindow';
import useScroll from 'hooks/useScroll';
import { routeNames } from 'routes';
import { FEATURE_FLAGS, IS_BUILDNET } from 'utils/config';

const Header = () => {
  const [showDropDown, setShowDropDown] = useState(false);
  const { connected } = useContext(AccountWrapperContext);
  const { interfaceTheme } = useContext(SettingsContext);
  const path = useLocation().pathname;

  const displayGovernance = FEATURE_FLAGS.GOVERNANCE_V2;

  const scrollPosition = useScroll();
  const { innerWidth: windowWidth } = useResizeWindow();
  const navItems: { title: string; link: string }[] = [
    { title: 'Trade', link: routeNames.trade },
    { title: 'Pools', link: routeNames.pools },
    { title: 'Portfolio', link: routeNames.portfolio },
    FEATURE_FLAGS.DCA && { title: 'DCA', link: routeNames.dca },
    FEATURE_FLAGS.GOVERNANCE_V2 && {
      title: 'Incentivize',
      link: routeNames.incentivize
    },
    displayGovernance && { title: 'Governance', link: routeNames.governance },
    FEATURE_FLAGS.POINTS && { title: '$DUSA', link: routeNames.dusa },
    FEATURE_FLAGS.VESTER && { title: 'Vester', link: routeNames.vester },
    FEATURE_FLAGS.SALE && { title: 'Sale', link: routeNames.sale },
    !IS_BUILDNET && { title: 'Bridge', link: 'https://bridge.massa.net/' },
    FEATURE_FLAGS.CEDESTORE && {
      title: 'CEX on-ramp',
      link: routeNames.cexOnRamp
    }
  ].filter((item): item is { title: string; link: string } => Boolean(item));

  const docsItem = { title: 'Docs', link: 'https://docs.dusa.io' };

  const navItemsVisibleIndex =
    windowWidth > 1000 ? 6 : windowWidth > 850 ? 5 : 4;

  const dropdownTrigger = (
    <button
      onClick={() => setShowDropDown(!showDropDown)}
      className='hover:bg-[var(--hover-bg)] p-2 rounded focus:outline-none'
    >
      <FontAwesomeIcon icon={faEllipsis} />
    </button>
  );

  return (
    <header
      className={clsx(
        'top-0 z-[100] sticky flex justify-between items-center bg-[var(--main-bg)] px-2 sm:px-6 py-2 h-[66px] transition-colors duration-100 ease-out',
        scrollPosition > 5 && 'border-b border-[var(--secondary-color)]'
      )}
    >
      <div className='flex items-center gap-8 w-full h-16'>
        <Link to={routeNames.home} className='flex items-center'>
          <img
            src={
              interfaceTheme === 'Halloween'
                ? logo_halloween
                : interfaceTheme === 'Winter'
                  ? logo_winter
                  : logo_white
            }
            alt='logo'
            className='w-24'
          />
        </Link>

        <nav className='hidden md:flex items-center space-x-8'>
          {navItems.slice(0, navItemsVisibleIndex).map((route, idx) =>
            route.link.startsWith('/') ? (
              <NavLink
                key={idx}
                to={route.link}
                className={({ isActive }) =>
                  clsx(
                    'relative font-semibold text-[var(--main-color)] hover:text-[var(--secondary-color)] text-base transition-colors',
                    (isActive || (path === '/' && route.link === '/trade')) &&
                      'text-[var(--secondary-color)]'
                  )
                }
              >
                {route.title}
                <span
                  className={clsx(
                    '-top-3 left-0 absolute bg-[var(--secondary-color)] w-full h-1',
                    !(
                      path === route.link ||
                      (route.link === '/trade' && path === '/')
                    ) && 'opacity-0'
                  )}
                />
              </NavLink>
            ) : (
              <a
                key={idx}
                href={route.link}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center font-semibold text-[var(--main-color)] hover:text-[var(--secondary-color)] text-base transition-colors'
              >
                {route.title}{' '}
                <FontAwesomeIcon
                  icon={faExternalLink}
                  className='ml-1 text-sm'
                />
              </a>
            )
          )}

          <Dropdown
            isOpen={showDropDown}
            setIsOpen={setShowDropDown}
            triggerButton={dropdownTrigger}
            position={windowWidth > 768 ? 'bottom left' : 'top left'}
          >
            <div className='flex flex-col'>
              {navItems
                .slice(navItemsVisibleIndex)
                .concat([docsItem])
                .map((route) =>
                  route.link.startsWith('/') ? (
                    <Link
                      key={route.title}
                      to={route.link}
                      className={clsx(
                        'hover:bg-[var(--hover-bg)] px-4 py-2 rounded-md hover:text-[var(--secondary-color)] text-left text-nowrap',
                        path === route.link &&
                          'bg-[var(--hover-bg)] text-[var(--secondary-color)]'
                      )}
                      onClick={() => setShowDropDown(false)}
                    >
                      {route.title}
                    </Link>
                  ) : (
                    <a
                      key={route.title}
                      href={route.link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center hover:bg-[var(--hover-bg)] px-4 py-2 rounded-md hover:text-[var(--secondary-color)] text-left'
                      onClick={() => setShowDropDown(false)}
                    >
                      {route.title}{' '}
                      <FontAwesomeIcon
                        icon={faExternalLink}
                        className='ml-2 text-sm'
                      />
                    </a>
                  )
                )}
            </div>
          </Dropdown>
        </nav>

        {/* Right-side actions */}
        <div className='right-2 sm:right-6 absolute flex items-center space-x-4'>
          {FEATURE_FLAGS.FAUCET && connected && (
            <Link
              to={routeNames.faucet}
              className={clsx(
                'flex items-center gap-3 bg-[var(--secondary-bg)] px-4 py-2 border border-transparent hover:border-[var(--secondary-color)] rounded-md font-bold text-[0.95rem] transition-colors nowrap',
                path === routeNames.faucet &&
                  'border border-[var(--secondary-color)] text-[var(--secondary-color)]'
              )}
            >
              <span className='hidden lg:flex'>Faucet</span>
              👛
            </Link>
          )}
          <GlobalSettings />
          <WalletConnect />
        </div>

        {/* Mobile Navigation */}
        <nav className='md:hidden right-0 bottom-0 left-0 fixed flex justify-around items-center bg-[var(--main-bg)] py-2 border-[var(--hover-bg)] border-t'>
          {navItems.slice(0, 4).map((route, idx) =>
            route.link.startsWith('/') ? (
              <NavLink
                key={idx}
                to={route.link}
                end={route.link === '/'}
                className={({ isActive }) =>
                  clsx(
                    'relative font-semibold text-[var(--main-color)] hover:text-[var(--secondary-color)] text-base transition-colors',
                    (isActive || (path === '/' && route.link === '/trade')) &&
                      'text-[var(--secondary-color)]'
                  )
                }
              >
                {route.title}
                <span
                  className={clsx(
                    '-bottom-3 left-0 absolute bg-[var(--secondary-color)] w-full h-1',
                    !(
                      path === route.link ||
                      (route.link === '/trade' && path === '/')
                    ) && 'opacity-0'
                  )}
                />
              </NavLink>
            ) : (
              <a
                key={idx}
                href={route.link}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center font-semibold text-[var(--main-color)] hover:text-[var(--secondary-color)] text-base transition-colors'
              >
                {route.title}
              </a>
            )
          )}
          {
            <Dropdown
              isOpen={showDropDown}
              setIsOpen={setShowDropDown}
              triggerButton={dropdownTrigger}
              position={windowWidth > 1024 ? 'bottom left' : 'top left'}
            >
              <div className='flex flex-col'>
                {navItems
                  .slice(4)
                  .concat([docsItem])
                  .map((route) =>
                    route.link.startsWith('/') ? (
                      <Link
                        key={route.title}
                        to={route.link}
                        className={clsx(
                          'hover:bg-[var(--hover-bg)] px-4 py-2 rounded-md hover:text-[var(--secondary-color)] text-left text-nowrap',
                          path === route.link &&
                            'bg-[var(--hover-bg)] text-[var(--secondary-color)]'
                        )}
                        onClick={() => setShowDropDown(false)}
                      >
                        {route.title}
                      </Link>
                    ) : (
                      <a
                        key={route.title}
                        href={route.link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center hover:bg-[var(--hover-bg)] px-4 py-2 rounded-md hover:text-[var(--secondary-color)] text-left'
                        onClick={() => setShowDropDown(false)}
                      >
                        {route.title}{' '}
                        <FontAwesomeIcon
                          icon={faExternalLink}
                          className='ml-2 text-sm'
                        />
                      </a>
                    )
                  )}
              </div>
            </Dropdown>
          }
        </nav>
      </div>
    </header>
  );
};

export default Header;
