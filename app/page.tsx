"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Building2,
  Database,
  MapPin,
  Settings,
  BarChart3,
  Users,
  LogOut,
  Layers,
  ArrowLeftRight,
  ArrowDown10,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Star,
  UserCog,
  Eye,
} from "lucide-react"
import { TenantManager } from "@/components/tenant-manager"
import { TenantSelector } from "@/components/tenant-selector"
import { UserPropertiesManager } from "@/components/user-properties-manager"
import { DataMappingsManager } from "@/components/data-mappings-manager"
import { CustomerOneViewManager } from "@/components/customer-one-view-manager"
import { trackNavigation, trackTenantSelection, trackAuthentication } from "@/lib/analytics"
import { ChannelPriority } from "@/components/channel-priority"
import { Dashboard } from "@/components/dashboard"
import { LoginForm } from "@/components/login-form"
import { UserManagement } from "@/components/user-management"
import VersionDisplay from "@/components/version-display"
import { Tenant, TenantSettings, Client } from "@/types/tenant"
import { getAuthState, clearAuthState, validateAuthState } from "@/lib/auth"

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUsername, setAuthUsername] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [activeTab, setActiveTab] = useState("user-properties")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showTenantSelector, setShowTenantSelector] = useState(false)
  const [favoriteClients, setFavoriteClients] = useState<Client[]>([])
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    apiKey: "",
    apiEndpoint: "",
    favoriteTenants: [],
  })

  // Responsive collapse detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsCollapsed(window.innerWidth < 1024) // Collapse on screens smaller than xl breakpoint
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  // Load tenant settings on startup
  useEffect(() => {
    const savedSettings = localStorage.getItem("cdp-tenant-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setTenantSettings(settings)
      } catch (e) {
        console.error("Failed to parse tenant settings:", e)
      }
    }
  }, []) // Only run once on startup

  // Function to load the saved tenant from API (only when authenticated)
  const loadSavedTenant = useCallback(async (settings: TenantSettings) => {
    if (!settings.selectedTenantId) {
      return
    }

    // Get the JWT token for authentication
    const authState = getAuthState()
    if (!authState.token) {
      console.error("No auth token available for loading saved tenant")
      handleSessionExpired()
      return
    }

    try {
      const response = await fetch("/api/clients", {
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status === 401 || response.status === 403) {
        // Token is expired or invalid - clear auth but preserve tenant settings
        console.log("Session expired - redirecting to login")
        handleSessionExpired()
        return
      }

      if (response.ok) {
        const clients: Client[] = await response.json()
        const savedClient = clients.find(client => client.id.toString() === settings.selectedTenantId)

        if (savedClient) {
          // Convert client to tenant format and set as selected
          const tenant: Tenant = {
            id: savedClient.id.toString(),
            name: savedClient.Name,
            displayName: savedClient.DisplayName,
            clientId: savedClient.id.toString(),
            apiKey: settings.apiKey,
            apiEndpoint: settings.apiEndpoint,
            isFavorite: settings.favoriteTenants?.includes(savedClient.id.toString()) || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          setSelectedTenant(tenant)
          setShowTenantSelector(false)
          console.log(`Auto-loaded last used tenant: ${tenant.displayName}`)
        } else {
          // Tenant not found, show selector
          setShowTenantSelector(true)
        }
      } else {
        // Other API errors, show selector
        console.error(`API error: ${response.status} ${response.statusText}`)
        setShowTenantSelector(true)
      }
    } catch (error) {
      console.error("Failed to load saved tenant:", error)
      setShowTenantSelector(true)
    }
  }, []) // No external dependencies for this function

  // Wrapper function for tracking navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    trackNavigation(tab, selectedTenant?.clientId)
  }

  // Wrapper function for tracking tenant selection
  const handleTenantSelection = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setShowTenantSelector(false)
    setActiveTab("user-properties") // Set User Properties as default when tenant is selected
    trackTenantSelection(tenant.clientId, tenant.name)
  }

  useEffect(() => {
    // First check if we have basic auth state
    const authState = getAuthState()

    // Set the basic auth state
    setIsAuthenticated(authState.isAuthenticated)
    setAuthUsername(authState.username)

    // Only proceed with tenant logic if we have a token
    if (authState.isAuthenticated && !selectedTenant) {
      if (tenantSettings.selectedTenantId) {
        // Try to load the saved tenant - this will handle expired tokens
        loadSavedTenant(tenantSettings)
      } else {
        // No saved tenant, show selector for tenant selection
        setShowTenantSelector(true)
      }
    } else if (!authState.isAuthenticated) {
      // Clear tenant-related state when not authenticated
      setSelectedTenant(null)
      setShowTenantSelector(false)
    }
  }, [selectedTenant, tenantSettings, loadSavedTenant]) // Include all dependencies

  const handleLoginSuccess = () => {
    const authState = getAuthState()
    setIsAuthenticated(true)
    setAuthUsername(authState.username)
    // The useEffect will handle tenant loading/selection based on saved settings
  }

  const handleLogout = () => {
    trackAuthentication("logout")
    clearAuthState()
    setIsAuthenticated(false)
    setAuthUsername(null)
    setSelectedTenant(null)
    setShowTenantSelector(false)
  }

  const handleSessionExpired = () => {
    // Handle expired session - clear auth but preserve tenant settings
    console.log("Session expired - clearing auth state but preserving tenant settings")
    clearAuthState()
    setIsAuthenticated(false)
    setAuthUsername(null)
    setSelectedTenant(null)
    setShowTenantSelector(false)
    // Note: We don't clear tenantSettings here so the user can return to their last tenant
  }

  const handleManageTenants = () => {
    setShowTenantSelector(false)
    setActiveTab("tenants")
  }

  const handleBackToTenantSelector = () => {
    setSelectedTenant(null)
    setShowTenantSelector(true)
  }

  // Fetch favorite clients when tenantSettings change
  const fetchFavoriteClients = useCallback(async () => {
    const favoriteTenants = tenantSettings.favoriteTenants || []

    if (!tenantSettings.apiKey || !tenantSettings.apiEndpoint || favoriteTenants.length === 0) {
      setFavoriteClients([])
      return
    }

    try {
      const authState = getAuthState()
      if (!authState.token) {
        return
      }

      const response = await fetch("/api/clients", {
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const allClients = await response.json()
        const favorites = allClients.filter((client: Client) => favoriteTenants.includes(client.id.toString()))
        setFavoriteClients(favorites)
      }
    } catch (error) {
      console.error("Error fetching favorite clients:", error)
    }
  }, [tenantSettings.apiKey, tenantSettings.apiEndpoint, tenantSettings.favoriteTenants])

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoriteClients()
    }
  }, [fetchFavoriteClients, isAuthenticated])

  const handleFavoriteTenantSelect = (client: Client) => {
    const tenant: Tenant = {
      id: client.id.toString(),
      name: client.Name,
      displayName: client.DisplayName,
      clientId: client.id.toString(),
      apiKey: tenantSettings.apiKey,
      apiEndpoint: tenantSettings.apiEndpoint,
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save selected tenant to localStorage
    const updatedSettings = { ...tenantSettings, selectedTenantId: client.id.toString() }
    setTenantSettings(updatedSettings)
    localStorage.setItem("cdp-tenant-settings", JSON.stringify(updatedSettings))

    handleTenantSelection(tenant)
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  if (showTenantSelector) {
    return <TenantSelector onTenantSelected={handleTenantSelection} onManageTenants={handleManageTenants} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Sidebar */}
      <div
        className={`${
          isCollapsed ? "w-16" : "w-80"
        } bg-white border-r border-slate-200 shadow-sm flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className={`${isCollapsed ? "p-3" : "p-6"} border-b border-slate-200 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-1">
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-full">
                      <Gauge className="h-6 w-6 text-slate-900" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>CDP Console</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Gauge className="h-6 w-6 text-slate-900" />
                  <h1 className="text-2xl font-bold text-slate-900">CDP Console</h1>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-slate-500 hover:text-slate-700">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Collapse sidebar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
          {!isCollapsed && <p className="text-slate-600 text-sm">Welcome, {authUsername}</p>}

          {/* Collapse Toggle for collapsed state */}
          {isCollapsed && (
            <div className="mt-2 flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="text-slate-500 hover:text-slate-700">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Expand sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Current Tenant & Favorites */}
        {!isCollapsed && (
          <div className="p-4 border-b border-slate-200">
            {/* Current Tenant Info */}
            {selectedTenant && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-700">Current Tenant</h4>
                  <Button variant="ghost" size="sm" onClick={handleBackToTenantSelector} className="h-6 px-2 text-xs">
                    Switch
                  </Button>
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  {selectedTenant.displayName} (ID: {selectedTenant.clientId})
                </div>
              </div>
            )}

            {/* Favorites List */}
            {favoriteClients.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <h4 className="text-sm font-medium text-slate-700">Favorites ({favoriteClients.length})</h4>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleBackToTenantSelector} className="h-6 px-2 text-xs">
                    View All
                  </Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {favoriteClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleFavoriteTenantSelect(client)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTenant?.clientId === client.id.toString()
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{client.DisplayName}</span>
                        <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                      </div>
                      <div className="text-xs text-slate-500 truncate pl-6">{client.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? "p-2" : "p-4"} transition-all duration-300`}>
          <TooltipProvider>
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("user-properties")}
                    disabled={!selectedTenant}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "user-properties"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedTenant
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}>
                    <UserCog className="h-4 w-4" />
                    {!isCollapsed && "User Properties"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>User Properties</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("mappings")}
                    disabled={!selectedTenant}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "mappings"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedTenant
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}>
                    <ArrowLeftRight className="h-4 w-4" />
                    {!isCollapsed && "Data Mappings"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Data Mappings</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("customer-one-view")}
                    disabled={!selectedTenant}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "customer-one-view"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedTenant
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}>
                    <Eye className="h-4 w-4" />
                    {!isCollapsed && "Customer One View"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Customer One View</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("users")}
                    disabled={!selectedTenant}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "users"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedTenant
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}>
                    <Users className="h-4 w-4" />
                    {!isCollapsed && "User Management"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>User Management</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("tenants")}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "tenants"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}>
                    <Building2 className="h-4 w-4" />
                    {!isCollapsed && "Tenant Management"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Tenant Management</p>
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Channel Priority - Hidden for now, may come back to this later */}
              {/* <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleTabChange("channel-priority")}
                    disabled={!selectedTenant}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                    } rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "channel-priority"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedTenant
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-400 cursor-not-allowed"
                    }`}>
                    <ArrowDown10 className="h-4 w-4" />
                    {!isCollapsed && "Channel Priority"}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Channel Priority</p>
                  </TooltipContent>
                )}
              </Tooltip> */}
            </div>
          </TooltipProvider>
        </nav>

        {/* Footer with Logout and Version */}
        <div
          className={`${isCollapsed ? "p-2" : "p-4"} border-t border-slate-200 space-y-2 transition-all duration-300`}>
          {isCollapsed ? (
            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center text-slate-500 hover:text-slate-700">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
                <VersionDisplay isCollapsed={isCollapsed} />
              </div>
            </TooltipProvider>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-700 justify-start px-3 py-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
              <VersionDisplay isCollapsed={isCollapsed} />
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Dashboard - Hidden for now */}
          {/* {activeTab === "dashboard" && (
            <>
              {selectedTenant ? (
                <Dashboard tenant={selectedTenant} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to view dashboard metrics</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )} */}

          {activeTab === "tenants" && (
            <TenantManager
              onTenantSelected={tenant => {
                handleTenantSelection(tenant)
                setActiveTab("user-properties") // Go back to user properties after selecting
              }}
              onSettingsUpdated={() => {
                // Reload tenant settings
                const savedSettings = localStorage.getItem("cdp-tenant-settings")
                if (savedSettings) {
                  try {
                    const settings = JSON.parse(savedSettings)
                    setTenantSettings(settings)
                    // Refresh favorites when settings change
                    fetchFavoriteClients()
                  } catch (e) {
                    console.error("Failed to parse tenant settings:", e)
                  }
                }
              }}
              onAuthExpired={() => {
                setIsAuthenticated(false)
                setAuthUsername(null)
              }}
            />
          )}

          {activeTab === "user-properties" && (
            <>
              {selectedTenant ? (
                <UserPropertiesManager
                  tenant={selectedTenant}
                  onAuthExpired={() => {
                    setIsAuthenticated(false)
                    setAuthUsername(null)
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to manage user properties</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "mappings" && (
            <>
              {selectedTenant ? (
                <DataMappingsManager
                  tenant={selectedTenant}
                  onAuthExpired={() => {
                    setIsAuthenticated(false)
                    setAuthUsername(null)
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to manage data mappings</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "customer-one-view" && (
            <>
              {selectedTenant ? (
                <CustomerOneViewManager
                  tenant={selectedTenant}
                  onAuthExpired={() => {
                    setIsAuthenticated(false)
                    setAuthUsername(null)
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Eye className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to manage customer one view</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "users" && (
            <>
              {selectedTenant ? (
                <UserManagement
                  tenant={selectedTenant}
                  onAuthExpired={() => {
                    setIsAuthenticated(false)
                    setAuthUsername(null)
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to manage users</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Channel Priority - Hidden for now, may come back to this later */}
          {/* {activeTab === "channel-priority" && (
            <>
              {selectedTenant ? (
                <ChannelPriority
                  tenant={selectedTenant}
                  onAuthExpired={() => {
                    setIsAuthenticated(false)
                    setAuthUsername(null)
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Layers className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to view channel priority</p>
                    <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )} */}
        </div>
      </div>
    </div>
  )
}

export default Home
