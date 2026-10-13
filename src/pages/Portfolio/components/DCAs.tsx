import ActiveDCA from 'pages/DCA/components/ActiveDCA';
import { dCA } from 'utils/trpc';
import { RefetchDrawerElement } from 'utils/types';

export const DCAsOwn = ({
  dcas,
  refetch
}: {
  dcas: dCA[];
  refetch: (elements?: RefetchDrawerElement[]) => void;
}) => {
  return (
    <div className='AssetsOwned'>
      <div className='assets-owned-container'>
        <ActiveDCA dcas={dcas} refetch={refetch} isLoading={false} isDrawer />
      </div>
    </div>
  );
};
