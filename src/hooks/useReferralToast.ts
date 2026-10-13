import { useEffect, useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  showReferralSuccessToast,
  showReferralWarningToast,
  showReferralInfoToast,
  showSelfReferralWarningToast
} from 'components/ReferralToastContent';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import {
  getStoredReferralCode,
  setReferralCode,
  setReferralTimestamp,
  clearReferralCode
} from 'utils/storage';
import { trpc } from 'utils/trpc';

export const useReferralToast = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { connectedAddress } = useContext(AccountWrapperContext);
  const [pendingRefCode, setPendingRefCode] = useState<string | null>(null);

  const godfatherQuery = trpc.getGodfather.useQuery(
    { userAddress: connectedAddress },
    { enabled: !!connectedAddress }
  );

  const getCodeQuery = trpc.getCode.useQuery(
    { userAddress: connectedAddress },
    { enabled: !!connectedAddress }
  );

  const userReferralCode =
    typeof getCodeQuery.data === 'string' ? getCodeQuery.data : undefined;

  // Show toast based on referral status
  const showReferralToast = (code: string) => {
    const isAlreadyReferred = !!godfatherQuery.data;
    const isConnected = !!connectedAddress;
    const isOwnReferralCode =
      isConnected && userReferralCode && code === userReferralCode;

    // Check if user is trying to use their own referral code
    if (isOwnReferralCode) {
      showSelfReferralWarningToast(code);
      return;
    }

    if (isConnected && isAlreadyReferred) {
      showReferralWarningToast(code);
    } else if (isConnected && !isAlreadyReferred) {
      showReferralSuccessToast(code);
    } else {
      // User not connected - show info toast to encourage connection
      showReferralInfoToast(code);
    }
  };

  // Handle URL detection and cleanup
  useEffect(() => {
    const urlParams = new URLSearchParams(search);
    const refCodeFromUrl = urlParams.get('ref');

    if (refCodeFromUrl && refCodeFromUrl.trim()) {
      setPendingRefCode(refCodeFromUrl);

      // Clean up the URL by removing the ref parameter
      urlParams.delete('ref');
      const newSearch = urlParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '');

      // Replace current URL without adding to history
      navigate(newUrl, { replace: true });
    }
  }, [search, navigate]);

  // Handle storage and toast once we have godfather data
  useEffect(() => {
    if (!pendingRefCode || godfatherQuery.isLoading || getCodeQuery.isLoading)
      return;

    // Show toast immediately for URL-detected codes
    showReferralToast(pendingRefCode);

    // Check if this is user's own referral code
    const isOwnReferralCode =
      connectedAddress &&
      userReferralCode &&
      pendingRefCode === userReferralCode;

    // Don't store self-referral codes
    if (isOwnReferralCode) {
      setPendingRefCode(null);
      return;
    }

    // Store code if user is not already referred
    if (connectedAddress && godfatherQuery.isSuccess) {
      const isAlreadyReferred = !!godfatherQuery.data;
      if (!isAlreadyReferred) {
        setReferralCode(pendingRefCode);
        setReferralTimestamp(Date.now());
      }
    } else if (!connectedAddress) {
      // Store code for later use when user connects
      setReferralCode(pendingRefCode);
      setReferralTimestamp(Date.now());
    }

    // Clear pending code
    setPendingRefCode(null);
  }, [
    pendingRefCode,
    connectedAddress,
    godfatherQuery.isLoading,
    godfatherQuery.isSuccess,
    godfatherQuery.data,
    getCodeQuery.isLoading,
    userReferralCode
  ]);

  const consumeReferralCode = (): string | null => {
    const code = getStoredReferralCode();
    if (code) {
      clearReferralCode();
    }
    return code;
  };

  return {
    getStoredReferralCode,
    consumeReferralCode,
    hasValidReferralCode: !!getStoredReferralCode()
  };
};

export default useReferralToast;
