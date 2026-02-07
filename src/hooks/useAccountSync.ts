import { useEffect, useRef } from 'react';
import { useAccountsStore } from '../store/accounts';

export function useAccountSync(callback: () => void | Promise<void>) {
  const { accountVersion } = useAccountsStore();
  const previousVersionRef = useRef(accountVersion);

  useEffect(() => {
    if (previousVersionRef.current !== accountVersion && previousVersionRef.current !== 0) {
      callback();
    }
    previousVersionRef.current = accountVersion;
  }, [accountVersion, callback]);
}
