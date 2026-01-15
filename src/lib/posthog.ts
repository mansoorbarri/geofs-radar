import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) {
    console.warn("PostHog key not found");
    return;
  }

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });
};

export const track = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
};

// Predefined events for consistency
export const analytics = {
  // Weather controls
  weatherPrecipitationToggled: (enabled: boolean) =>
    track("weather_precipitation_toggled", { enabled }),
  weatherAirmetsToggled: (enabled: boolean) =>
    track("weather_airmets_toggled", { enabled }),
  weatherSigmetsToggled: (enabled: boolean) =>
    track("weather_sigmets_toggled", { enabled }),

  // Map controls
  mapHeadingModeToggled: (enabled: boolean) =>
    track("map_heading_mode_toggled", { enabled }),
  mapRadarModeToggled: (enabled: boolean) =>
    track("map_radar_mode_toggled", { enabled }),
  mapOsmToggled: (enabled: boolean) =>
    track("map_osm_toggled", { enabled }),
  mapOpenAipToggled: (enabled: boolean) =>
    track("map_openaip_toggled", { enabled }),
  mapSettingsToggled: (enabled: boolean) =>
    track("map_settings_toggled", { enabled }),

  // Panel controls
  controlDockToggled: (open: boolean) =>
    track("control_dock_toggled", { open }),
  panelFlightsToggled: (active: boolean) =>
    track("panel_flights_toggled", { active }),
  panelFilterToggled: (active: boolean) =>
    track("panel_filter_toggled", { active }),

  // Sidebar
  sidebarTabChanged: (tab: string) =>
    track("sidebar_tab_changed", { tab }),
  historyFlightClicked: () =>
    track("history_flight_clicked"),

  // Pricing & Upgrade
  pricingPageViewed: () =>
    track("pricing_page_viewed"),
  upgradeButtonClicked: (location: string) =>
    track("upgrade_button_clicked", { location }),
  manageSubscriptionClicked: () =>
    track("manage_subscription_clicked"),

  // Search & Filter
  searchPerformed: (type: "aircraft" | "airport") =>
    track("search_performed", { type }),
  airlineFilterToggled: (prefix: string, active: boolean) =>
    track("airline_filter_toggled", { prefix, active }),
  airlineFilterCleared: () =>
    track("airline_filter_cleared"),

  // Aircraft tracking
  aircraftTracked: (callsign: string) =>
    track("aircraft_tracked", { callsign }),

  // Taxi chart
  taxiChartOpened: (icao: string) =>
    track("taxi_chart_opened", { icao }),
  taxiChartPremiumClicked: () =>
    track("taxi_chart_premium_clicked"),

  // Timer
  timerStarted: () => track("timer_started"),
  timerStopped: () => track("timer_stopped"),
  timerReset: () => track("timer_reset"),

  // Mobile
  mobileSearchOpened: () => track("mobile_search_opened"),
};

export { posthog };
