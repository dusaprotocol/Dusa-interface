import clsx from 'clsx/lite';
import './index.scss';

export interface TabProps {
  tabs: string[];
  activeTab: number;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
  variant?: 'default' | 'bottom-plane';
  fullWidth?: boolean;
}

const Tabs = ({
  tabs,
  activeTab,
  setActiveTab,
  variant = 'default',
  fullWidth
}: TabProps) => {
  return (
    <div className={clsx('Tabs', variant, fullWidth && 'fullWidth')}>
      {tabs.map((tab, i) => (
        <button
          className={clsx('tab', i === activeTab && 'activeTab')}
          key={tab}
          onClick={() => setActiveTab(i)}
        >
          <div>{tab}</div>
        </button>
      ))}
    </div>
  );
};

export default Tabs;
