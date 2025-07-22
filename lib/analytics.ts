// Google Analytics tracking utilities

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, any>) => void
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

// Check if GA is available
export const isGAEnabled = (): boolean => {
  return !!(GA_TRACKING_ID && typeof window !== "undefined" && window.gtag)
}

// Track page views
export const pageview = (url: string) => {
  if (isGAEnabled()) {
    window.gtag("config", GA_TRACKING_ID!, {
      page_location: url,
    })
  }
}

// Track virtual page views for SPA navigation
export const trackVirtualPageView = (pageName: string, title?: string) => {
  if (isGAEnabled()) {
    window.gtag("event", "page_view", {
      page_title: title || pageName,
      page_location: `${window.location.origin}${window.location.pathname}#${pageName}`,
      page_path: `/${pageName}`,
    })
  }
}

// Track events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (isGAEnabled()) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Track custom events for this CDP Console
export const trackUserAction = (action: string, details?: Record<string, any>) => {
  event({
    action,
    category: "user_interaction",
    label: JSON.stringify(details),
  })
}

export const trackAPICall = (endpoint: string, method: string, success: boolean) => {
  event({
    action: "api_call",
    category: "api",
    label: `${method} ${endpoint}`,
    value: success ? 1 : 0,
  })
}

export const trackError = (errorType: string, errorMessage: string, location?: string) => {
  event({
    action: "error",
    category: "error",
    label: `${errorType}: ${errorMessage} ${location ? `(${location})` : ""}`,
  })
}

export const trackAuthentication = (action: "login" | "logout" | "login_failed") => {
  event({
    action,
    category: "authentication",
  })
}

export const trackDataManagement = (
  action: string,
  resourceType: "user_property" | "data_mapping" | "user" | "channel_priority",
  details?: Record<string, any>,
) => {
  event({
    action,
    category: "data_management",
    label: `${resourceType}: ${JSON.stringify(details || {})}`,
  })
}

// Track navigation between sections
export const trackNavigation = (section: string, tenantId?: string) => {
  trackVirtualPageView(section, `CDP Console - ${section}`)
  event({
    action: "navigate",
    category: "navigation",
    label: section,
    value: tenantId ? 1 : 0, // 1 if tenant selected, 0 if not
  })
}

// Track tenant selection
export const trackTenantSelection = (tenantId: string, tenantName: string) => {
  event({
    action: "select_tenant",
    category: "tenant_management",
    label: `${tenantName} (${tenantId})`,
  })
}

// Track specific user actions in detail
export const trackDetailedUserAction = (
  action: "add" | "edit" | "delete" | "view" | "export" | "import" | "refresh",
  context: string,
  details?: Record<string, any>,
) => {
  event({
    action: `${action}_${context}`,
    category: "user_action",
    label: JSON.stringify(details || {}),
  })
}

// Track form interactions
export const trackFormInteraction = (
  formType: "add" | "edit",
  resourceType: string,
  action: "open" | "submit" | "cancel" | "error",
) => {
  event({
    action: `form_${action}`,
    category: "form_interaction",
    label: `${formType}_${resourceType}`,
  })
}

// Track search and filter usage
export const trackSearchFilter = (
  searchType: "search" | "filter" | "sort" | "paginate",
  context: string,
  query?: string,
) => {
  event({
    action: searchType,
    category: "search_filter",
    label: `${context}: ${query || ""}`,
  })
}
