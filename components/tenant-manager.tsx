"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit2, Building2, Key, Globe, User, Eye, EyeOff, Star, Search, Loader2, RefreshCw } from "lucide-react"
import { Client, TenantSettings, Tenant } from "@/types/tenant"
import { getAuthState } from "@/lib/auth"
import { trackAPICall, trackDetailedUserAction } from "@/lib/analytics"

interface TenantManagerProps {
  onSettingsUpdated?: () => void
  onAuthExpired?: () => void
  onTenantSelected?: (tenant: Tenant) => void
}

export const TenantManager = ({ onSettingsUpdated, onAuthExpired, onTenantSelected }: TenantManagerProps) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    apiKey: "",
    apiEndpoint: "",
    favoriteTenants: [],
  })
  const [settingsForm, setSettingsForm] = useState({
    apiKey: "",
    apiEndpoint: "",
  })

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("cdp-tenant-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setTenantSettings(settings)
        setSettingsForm({
          apiKey: settings.apiKey || "",
          apiEndpoint: settings.apiEndpoint || "",
        })
      } catch (e) {
        console.error("Failed to parse tenant settings:", e)
      }
    } else {
      // Initialize with default values from env
      const defaultSettings: TenantSettings = {
        apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "",
        apiEndpoint: process.env.NEXT_PUBLIC_DEFAULT_API_ENDPOINT || "",
        favoriteTenants: [],
      }
      setTenantSettings(defaultSettings)
      setSettingsForm({
        apiKey: defaultSettings.apiKey,
        apiEndpoint: defaultSettings.apiEndpoint,
      })
    }
  }, [])

  const saveSettings = (newSettings: TenantSettings) => {
    setTenantSettings(newSettings)
    localStorage.setItem("cdp-tenant-settings", JSON.stringify(newSettings))
    onSettingsUpdated?.()
  }

  const fetchClients = useCallback(async () => {
    if (!tenantSettings.apiKey || !tenantSettings.apiEndpoint) {
      setError("API configuration is missing. Please configure your API endpoint and key.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const authState = getAuthState()
      if (!authState.token) {
        setError("Authentication required. Please log in.")
        onAuthExpired?.()
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
        setError("Session expired. Please log in again.")
        onAuthExpired?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch tenant list")
        trackAPICall("/api/clients", "GET", false)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setError("Network error. Please check your connection.")
      trackAPICall("/api/clients", "GET", false)
    } finally {
      setLoading(false)
    }
  }, [tenantSettings.apiKey, tenantSettings.apiEndpoint, onAuthExpired])

  useEffect(() => {
    if (tenantSettings.apiKey && tenantSettings.apiEndpoint) {
      fetchClients()
    }
  }, [fetchClients, tenantSettings.apiKey, tenantSettings.apiEndpoint])

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedSettings = {
      ...tenantSettings,
      apiKey: settingsForm.apiKey,
      apiEndpoint: settingsForm.apiEndpoint,
    }
    saveSettings(updatedSettings)
    setIsSettingsDialogOpen(false)
    // Refresh clients with new settings
    fetchClients()
  }

  const toggleFavorite = (clientId: string) => {
    const updatedFavorites = tenantSettings.favoriteTenants.includes(clientId)
      ? tenantSettings.favoriteTenants.filter(id => id !== clientId)
      : [...tenantSettings.favoriteTenants, clientId]

    const updatedSettings = {
      ...tenantSettings,
      favoriteTenants: updatedFavorites,
    }
    saveSettings(updatedSettings)

    trackDetailedUserAction(tenantSettings.favoriteTenants.includes(clientId) ? "delete" : "add", "favorite", {
      tenantId: clientId,
    })
  }

  const handleTenantSelect = (client: Client) => {
    if (!onTenantSelected) return

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

    // Save selected tenant to localStorage
    const updatedSettings = { ...tenantSettings, selectedTenantId: client.id.toString() }
    saveSettings(updatedSettings)

    trackDetailedUserAction("view", "tenant", {
      tenantId: client.id.toString(),
      tenantName: client.DisplayName,
    })

    onTenantSelected(tenant)
  }

  const filteredClients = clients.filter(
    client =>
      client.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.id.toString().includes(searchTerm),
  )

  const favoriteClients = filteredClients.filter(client =>
    tenantSettings.favoriteTenants.includes(client.id.toString()),
  )

  // When searching, show all filtered results. When not searching, exclude favorites from "All Tenants"
  const otherClients = searchTerm
    ? filteredClients // Show all filtered results when searching
    : filteredClients.filter(client => !tenantSettings.favoriteTenants.includes(client.id.toString()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenant Management</h2>
          <p className="text-slate-600">Manage your CDP tenant configurations and favorites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchClients} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>API Configuration</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint</Label>
                  <Input
                    id="apiEndpoint"
                    value={settingsForm.apiEndpoint}
                    onChange={e => setSettingsForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                    placeholder="https://api.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={settingsForm.apiKey}
                      onChange={e => setSettingsForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API key"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Settings</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by tenant name, ID, or display name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Tenants</h3>
            <p className="text-slate-600">Fetching available tenants...</p>
          </CardContent>
        </Card>
      )}

      {!loading && clients.length > 0 && (
        <>
          {/* Favorites */}
          {favoriteClients.length > 0 && !searchTerm && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <h3 className="text-lg font-semibold text-slate-900">Favorite Tenants ({favoriteClients.length})</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favoriteClients.map(client => (
                  <Card
                    key={client.id}
                    className="border border-yellow-200 bg-yellow-50 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleTenantSelect(client)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-5 w-5 text-slate-600 flex-shrink-0" />
                          <CardTitle className="text-lg truncate">{client.DisplayName}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            toggleFavorite(client.id.toString())
                          }}
                          className="text-yellow-600 hover:text-yellow-700 flex-shrink-0">
                          <Star className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        <span>Name:</span>
                        <span className="truncate">{client.Name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        <span>Client ID:</span>
                        <Badge variant="outline" className="text-xs">
                          {client.id}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant={client.Status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {client.Status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Tenants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {searchTerm
                ? `Search Results (${filteredClients.length})`
                : favoriteClients.length > 0
                ? "All Tenants"
                : "Available Tenants"}{" "}
              {!searchTerm && `(${filteredClients.length})`}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherClients.map(client => {
                const isFavorite = tenantSettings.favoriteTenants.includes(client.id.toString())
                return (
                  <Card
                    key={client.id}
                    className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isFavorite ? "border border-yellow-200 bg-yellow-50" : ""
                    }`}
                    onClick={() => handleTenantSelect(client)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-5 w-5 text-slate-600 flex-shrink-0" />
                          <CardTitle className="text-lg truncate">{client.DisplayName}</CardTitle>
                          {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            toggleFavorite(client.id.toString())
                          }}
                          className={`flex-shrink-0 ${
                            isFavorite
                              ? "text-yellow-600 hover:text-yellow-700"
                              : "text-slate-400 hover:text-yellow-500"
                          }`}>
                          <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        <span>Name:</span>
                        <span className="truncate">{client.Name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        <span>Client ID:</span>
                        <Badge variant="outline" className="text-xs">
                          {client.id}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant={client.Status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {client.Status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!loading && filteredClients.length === 0 && clients.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Found</h3>
            <p className="text-slate-600">No tenants match your search criteria.</p>
          </CardContent>
        </Card>
      )}

      {!loading && clients.length === 0 && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Available</h3>
            <p className="text-slate-600 mb-4">
              No tenants are currently available. Please check your API configuration.
            </p>
            <Button onClick={() => setIsSettingsDialogOpen(true)}>
              <Key className="h-4 w-4 mr-2" />
              Configure API Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
