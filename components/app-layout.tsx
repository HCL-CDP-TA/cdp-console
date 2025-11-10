"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Database,
  Users,
  LogOut,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Star,
  UserCog,
  Eye,
  Inbox,
  Search,
  Loader2,
  Gauge,
} from "lucide-react"
import VersionDisplay from "@/components/version-display"
import { Tenant, TenantSettings, Client } from "@/types/tenant"
import { getAuthState, clearAuthState, validateAuthState } from "@/lib/auth"
import {
  trackNavigation,
  trackTenantSelection,
  trackAuthentication,
  trackAPICall,
  trackDetailedUserAction,
} from "@/lib/analytics"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUsername, setAuthUsername] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showTenantSelector, setShowTenantSelector] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    apiKey: "",
    apiEndpoint: "",
    favoriteTenants: [],
  })
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Load tenant settings
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
  }, [])

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authResult = await validateAuthState()
      if (authResult.isValid) {
        setIsAuthenticated(true)
        const authState = getAuthState()
        setAuthUsername(authState.username || null)

        // Load saved tenant from localStorage
        const savedTenantId = localStorage.getItem("selectedTenantId")
        if (savedTenantId) {
          const savedTenant = JSON.parse(localStorage.getItem(`tenant-${savedTenantId}`) || "{}")
          if (savedTenant.id) {
            setSelectedTenant(savedTenant)
          }
        }
      } else {
        router.push("/")
      }
    }
    checkAuth()
  }, [router])

  // Fetch clients when tenant selector is shown
  const fetchClients = useCallback(async () => {
    if (!tenantSettings.apiKey || !tenantSettings.apiEndpoint) {
      return
    }

    setLoadingClients(true)
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
        const data = await response.json()
        setClients(data)
        trackAPICall("/api/clients", "GET", true)
      } else if (response.status === 401) {
        // Token is expired or invalid - clear auth and redirect to login
        console.log("Authentication failed - redirecting to login")
        clearAuthState()
        setIsAuthenticated(false)
        setAuthUsername(null)
        setSelectedTenant(null)
        trackAPICall("/api/clients", "GET", false)
        router.push("/login")
      } else {
        trackAPICall("/api/clients", "GET", false)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      trackAPICall("/api/clients", "GET", false)
    } finally {
      setLoadingClients(false)
    }
  }, [tenantSettings.apiKey, tenantSettings.apiEndpoint, router])

  // Fetch clients when authenticated and settings are available
  useEffect(() => {
    if (isAuthenticated && tenantSettings.apiKey && tenantSettings.apiEndpoint && clients.length === 0) {
      fetchClients()
    }
  }, [isAuthenticated, tenantSettings.apiKey, tenantSettings.apiEndpoint, fetchClients, clients.length])

  useEffect(() => {
    if (showTenantSelector && clients.length === 0) {
      fetchClients()
    }
  }, [showTenantSelector, fetchClients, clients.length])

  const handleLogout = useCallback(() => {
    clearAuthState()
    trackAuthentication("logout")
    setIsAuthenticated(false)
    setAuthUsername(null)
    setSelectedTenant(null)
    router.push("/")
  }, [authUsername, router])

  const handleTenantSelect = useCallback(
    (client: Client) => {
      const tenant: Tenant = {
        id: client.id.toString(),
        name: client.Name,
        displayName: client.DisplayName,
        clientId: client.id.toString(),
        apiKey: tenantSettings.apiKey,
        apiEndpoint: tenantSettings.apiEndpoint,
        isFavorite: tenantSettings.favoriteTenants.includes(client.id.toString()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setSelectedTenant(tenant)
      setShowTenantSelector(false)
      setSearchTerm("")

      // Save selected tenant
      localStorage.setItem("selectedTenantId", tenant.id)
      localStorage.setItem(`tenant-${tenant.id}`, JSON.stringify(tenant))

      trackTenantSelection(tenant.clientId, tenant.name)
      trackDetailedUserAction("view", "tenant", {
        tenantId: client.id.toString(),
        tenantName: client.DisplayName,
      })

      router.push("/user-properties")
    },
    [router, tenantSettings],
  )

  const toggleFavorite = useCallback(
    (clientId: string, event: React.MouseEvent) => {
      event.stopPropagation()
      const updatedFavorites = tenantSettings.favoriteTenants.includes(clientId)
        ? tenantSettings.favoriteTenants.filter(id => id !== clientId)
        : [...tenantSettings.favoriteTenants, clientId]

      const updatedSettings = {
        ...tenantSettings,
        favoriteTenants: updatedFavorites,
      }
      setTenantSettings(updatedSettings)
      localStorage.setItem("cdp-tenant-settings", JSON.stringify(updatedSettings))

      trackDetailedUserAction(tenantSettings.favoriteTenants.includes(clientId) ? "delete" : "add", "favorite", {
        tenantId: clientId,
      })
    },
    [tenantSettings],
  )

  const isActive = (path: string) => {
    if (path === "/data-sources" && pathname?.startsWith("/data-source")) {
      return true
    }
    return pathname === path
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <aside
          className={`${
            isCollapsed ? "w-16" : "w-64"
          } bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
          {/* Logo/Header */}
          <div className={`p-4 border-b border-slate-200 ${isCollapsed ? "text-center" : ""}`}>
            <div className="flex items-center justify-between">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-full">
                      <Gauge className="h-6 w-6 text-blue-600" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>CDP Console</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2">
                  <Gauge className="h-6 w-6 text-blue-600" />
                  <h1 className="text-xl font-bold text-blue-600">CDP Console</h1>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={isCollapsed ? "" : ""}>
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Tenant Selector */}
          <div className={`p-3 border-b border-slate-200 ${isCollapsed ? "px-2" : ""}`}>
            {!isCollapsed && selectedTenant && (
              <div className="mb-2">
                <div className="text-xs text-slate-500 mb-1">Selected Tenant</div>
                <div className="text-sm font-medium text-slate-900 truncate">{selectedTenant.displayName}</div>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size={isCollapsed ? "sm" : "default"}
                  onClick={() => setShowTenantSelector(true)}
                  className={`w-full ${isCollapsed ? "px-2" : ""}`}>
                  <Building2 className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
                  {!isCollapsed && (selectedTenant ? "Change Tenant" : "Select Tenant")}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{selectedTenant ? "Change Tenant" : "Select Tenant"}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Favorite Tenants */}
          {!isCollapsed && tenantSettings.favoriteTenants.length > 0 && (
            <div className="p-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Favorites</h3>
              </div>
              <div className="space-y-1">
                {clients
                  .filter(client => tenantSettings.favoriteTenants.includes(client.id.toString()))
                  .slice(0, 5)
                  .map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleTenantSelect(client)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedTenant?.clientId === client.id.toString()
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}>
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.DisplayName}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/user-properties"
                  onClick={() => trackNavigation("user-properties")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/user-properties")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedTenant
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400 cursor-not-allowed pointer-events-none"
                  }`}>
                  <UserCog className="h-4 w-4" />
                  {!isCollapsed && "User Properties"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>User Properties</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/mappings"
                  onClick={() => trackNavigation("mappings")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/mappings")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedTenant
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400 cursor-not-allowed pointer-events-none"
                  }`}>
                  <ArrowLeftRight className="h-4 w-4" />
                  {!isCollapsed && "Data Mappings"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Data Mappings</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/customer-one-view"
                  onClick={() => trackNavigation("customer-one-view")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/customer-one-view")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedTenant
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400 cursor-not-allowed pointer-events-none"
                  }`}>
                  <Eye className="h-4 w-4" />
                  {!isCollapsed && "Customer One View"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Customer One View</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/data-sources"
                  onClick={() => trackNavigation("data-sources")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/data-sources")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedTenant
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400 cursor-not-allowed pointer-events-none"
                  }`}>
                  <Inbox className="h-4 w-4" />
                  {!isCollapsed && "Data Sources"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Data Sources</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/users"
                  onClick={() => trackNavigation("users")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/users")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedTenant
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400 cursor-not-allowed pointer-events-none"
                  }`}>
                  <Users className="h-4 w-4" />
                  {!isCollapsed && "User Management"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>User Management</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/tenants"
                  onClick={() => trackNavigation("tenants")}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2"
                  } rounded-lg text-sm font-medium transition-colors ${
                    isActive("/tenants")
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}>
                  <Database className="h-4 w-4" />
                  {!isCollapsed && "Manage Tenants"}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Manage Tenants</p>
                </TooltipContent>
              )}
            </Tooltip>
          </nav>

          {/* User Info & Logout */}
          <div className={`p-3 border-t border-slate-200 space-y-2 ${isCollapsed ? "px-2" : ""}`}>
            {!isCollapsed && authUsername && (
              <div className="text-xs text-slate-600 px-3 pb-2">Logged in as: {authUsername}</div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className={`w-full ${isCollapsed ? "px-2 justify-center" : "justify-start"}`}>
                  <LogOut className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
                  {!isCollapsed && "Logout"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Logout</p>
                </TooltipContent>
              )}
            </Tooltip>
            {!isCollapsed && <VersionDisplay />}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Tenant Selector Dialog */}
        <Dialog open={showTenantSelector} onOpenChange={setShowTenantSelector}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Select Tenant</h2>
                <p className="text-slate-600">Choose a tenant to manage</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTenantSelector(false)
                  router.push("/tenants")
                }}>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Tenants
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by tenant name, ID, or display name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingClients ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-600">Loading tenants...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Favorites */}
                {(() => {
                  const filteredClients = clients.filter(
                    client =>
                      client.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.id.toString().includes(searchTerm),
                  )
                  const favoriteClients = filteredClients.filter(client =>
                    tenantSettings.favoriteTenants.includes(client.id.toString()),
                  )
                  const otherClients = searchTerm
                    ? filteredClients
                    : filteredClients.filter(client => !tenantSettings.favoriteTenants.includes(client.id.toString()))

                  return (
                    <>
                      {favoriteClients.length > 0 && !searchTerm && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <h3 className="font-medium text-slate-900">Favorite Tenants</h3>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            {favoriteClients.map(client => (
                              <Card
                                key={client.id}
                                className="cursor-pointer hover:shadow-md transition-all duration-200 border border-yellow-200 bg-yellow-50"
                                onClick={() => handleTenantSelect(client)}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Building2 className="h-4 w-4 text-slate-600 flex-shrink-0" />
                                        <h4 className="font-medium text-slate-900 truncate">{client.DisplayName}</h4>
                                      </div>
                                      <p className="text-sm text-slate-600 truncate mb-2">{client.Name}</p>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          ID: {client.id}
                                        </Badge>
                                        <Badge
                                          variant={client.Status === "ACTIVE" ? "default" : "secondary"}
                                          className="text-xs">
                                          {client.Status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={e => toggleFavorite(client.id.toString(), e)}
                                      className="flex-shrink-0 ml-2 text-yellow-600 hover:text-yellow-700">
                                      <Star className="h-4 w-4 fill-current" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All/Search Results */}
                      {otherClients.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-medium text-slate-900">
                            {searchTerm
                              ? `Search Results (${filteredClients.length})`
                              : favoriteClients.length > 0
                              ? "All Tenants"
                              : "Available Tenants"}
                          </h3>
                          <div className="grid gap-2 md:grid-cols-2">
                            {otherClients.map(client => {
                              const isFavorite = tenantSettings.favoriteTenants.includes(client.id.toString())
                              return (
                                <Card
                                  key={client.id}
                                  className="cursor-pointer hover:shadow-md transition-all duration-200"
                                  onClick={() => handleTenantSelect(client)}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Building2 className="h-4 w-4 text-slate-600 flex-shrink-0" />
                                          <h4 className="font-medium text-slate-900 truncate">{client.DisplayName}</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 truncate mb-2">{client.Name}</p>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            ID: {client.id}
                                          </Badge>
                                          <Badge
                                            variant={client.Status === "ACTIVE" ? "default" : "secondary"}
                                            className="text-xs">
                                            {client.Status}
                                          </Badge>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={e => toggleFavorite(client.id.toString(), e)}
                                        className={`flex-shrink-0 ml-2 ${
                                          isFavorite
                                            ? "text-yellow-600 hover:text-yellow-700"
                                            : "text-slate-400 hover:text-yellow-500"
                                        }`}>
                                        <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {filteredClients.length === 0 && (
                        <div className="text-center py-8">
                          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Found</h3>
                          <p className="text-slate-600">
                            {searchTerm ? "No tenants match your search criteria." : "No tenants are available."}
                          </p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
