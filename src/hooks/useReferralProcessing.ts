import { useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { getStoredReferralCode, clearReferralCode } from 'utils/storage';
import { trpc } from 'utils/trpc';
import { useSignMessage } from './useSignMessage';

export const useReferralProcessing = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const { sign } = useSignMessage();
  const queryClient = useQueryClient();

  const referralMutation = trpc.beReferred.useMutation({
    onSuccess: async () => {
      // Invalidate getGodfather cache to refresh UI immediately
      await queryClient.invalidateQueries({
        queryKey: ['getGodfather', connectedAddress]
      });
    },
    onError: (error) => {
      // Note: We don't throw here to avoid blocking the main action (swap)
      console.error('Failed to process referral:', error);
    }
  });

  const processReferralIfAvailable = async () => {
    if (!connectedAddress) return null;

    const referralCode = getStoredReferralCode();
    if (!referralCode) return null;

    try {
      // Process the referral with signature like in JELLY page
      const sig = await sign(referralCode);
      if (!sig) {
        throw new Error('Signature required but not provided');
      }

      const { publicKey, signature } = sig;
      await referralMutation.mutateAsync({
        userAddress: connectedAddress,
        code: referralCode,
        publicKey,
        signature
      });

      // Only remove from storage AFTER successful transaction
      clearReferralCode();

      // Invalidate getGodfather cache to refresh UI
      await queryClient.invalidateQueries({
        queryKey: ['getGodfather', connectedAddress]
      });

      return referralCode;
    } catch (error) {
      // Code remains in storage for retry
      throw error; // Re-throw to let calling component handle the error
    }

    return null;
  };

  return {
    processReferralIfAvailable,
    hasReferralPending: !!getStoredReferralCode(),
    isProcessingReferral: referralMutation.isLoading
  };
};

export default useReferralProcessing;
