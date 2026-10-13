import { useEffect, useState } from 'react';
import eventEmitter from 'utils/eventEmitter';
import {
  getPendingDCACreation,
  getPendingDCADelete,
  setPendingDCACreationRemove,
  setPendingDCADeleteRemove
} from 'utils/storage';
import { dCA } from 'utils/trpc';

export const useManageDCA = (dcas: dCA[], userAddress: string) => {
  const [dcasLoading, setDcasLoading] = useState<number[]>([]);
  const [dcasRemoving, setDcasRemoving] = useState<number[]>([]);
  const [dcasUpdating, setDcasUpdating] = useState<number[]>([]);

  useEffect(() => {
    if (!userAddress) return;
    setDcasRemoving(getPendingDCADelete(userAddress));
  }, [userAddress]);

  useEffect(() => {
    if (!userAddress) return;
    if (dcas) {
      setPendingDCACreationRemove(
        userAddress,
        dcasLoading.filter(
          (dca) => dcas.find((d) => d.id === dca) !== undefined
        )
      );
      setPendingDCADeleteRemove(
        userAddress,
        dcasRemoving.filter(
          (dca) => dcas.find((d) => d.id === dca) === undefined
        )
      );
    }

    setDcasLoading(getPendingDCACreation(userAddress));
    setDcasRemoving(getPendingDCADelete(userAddress));
  }, [userAddress, dcas?.length]);

  useEffect(() => {
    const handleEvent = () => {
      const dcaIdsLoading = getPendingDCACreation(userAddress);
      setDcasLoading(dcaIdsLoading);
    };

    eventEmitter.on('updateDCAsLoading', handleEvent);

    return () => {
      eventEmitter.off('updateDCAsLoading', handleEvent);
    };
  }, [userAddress]);

  return {
    dcasLoading,
    setDcasLoading,
    dcasRemoving,
    setDcasRemoving,
    dcasUpdating,
    setDcasUpdating
  };
};
