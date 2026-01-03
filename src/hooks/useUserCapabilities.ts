"use client";

import { hasPRO } from "~/lib/capabilities";
import { useUserProfile } from "~/hooks/useUserProfile";

export function useUserCapabilities() {
  const { profile, loading } = useUserProfile();

  return {
    isPRO: hasPRO(profile?.role),
    canViewTaxiCharts: hasPRO(profile?.role),
    loading,
  };
}
