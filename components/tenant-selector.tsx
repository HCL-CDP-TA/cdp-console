"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Building2, Search, Star, Settings, Loader2 } from "lucide-react"
import { Client, Tenant, TenantSettings } from "@/types/tenant"
import { getAuthState } from "@/lib/auth"
import { trackAPICall, trackDetailedUserAction } from "@/lib/analytics"

interface TenantSelectorProps {
  onTenantSelected: (tenant: Tenant) => void
  onManageTenants: () => void
}

export const TenantSelector = ({ onTenantSelected, onManageTenants }: TenantSelectorProps) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    apiKey: "",
    apiEndpoint: "",
    favoriteTenants: [],
  })

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("cdp-tenant-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setTenantSettings(settings)
      } catch (e) {
        console.error("Failed to parse tenant settings:", e)
        // Initialize with default values from env
        const defaultSettings: TenantSettings = {
          apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "",
          apiEndpoint: process.env.NEXT_PUBLIC_DEFAULT_API_ENDPOINT || "",
          favoriteTenants: [],
        }
        setTenantSettings(defaultSettings)
        localStorage.setItem("cdp-tenant-settings", JSON.stringify(defaultSettings))
      }
    } else {
      // Initialize with default values from env
      const defaultSettings: TenantSettings = {
        apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "",
        apiEndpoint: process.env.NEXT_PUBLIC_DEFAULT_API_ENDPOINT || "",
        favoriteTenants: [],
      }
      setTenantSettings(defaultSettings)
      localStorage.setItem("cdp-tenant-settings", JSON.stringify(defaultSettings))
    }
  }, [])

  const fetchClients = useCallback(async () => {
    if (!tenantSettings.apiKey || !tenantSettings.apiEndpoint) {
      setError("API configuration is missing. Please set up your API endpoint and key.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const authState = getAuthState()
      if (!authState.token) {
        setError("Authentication required. Please log in.")
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
  }, [tenantSettings.apiKey, tenantSettings.apiEndpoint])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = clients.filter(
    client =>
      client.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.id.toString().includes(searchTerm),
  )

  const favoriteClients = filteredClients.filter(client =>
    tenantSettings.favoriteTenants.includes(client.id.toString()),
  )
  const otherClients = filteredClients.filter(client => !tenantSettings.favoriteTenants.includes(client.id.toString()))

  const handleTenantSelect = (client: Client) => {
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
    setTenantSettings(updatedSettings)
    localStorage.setItem("cdp-tenant-settings", JSON.stringify(updatedSettings))

    trackDetailedUserAction("view", "tenant", {
      tenantId: client.id.toString(),
      tenantName: client.DisplayName,
    })

    onTenantSelected(tenant)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Tenants</h3>
            <p className="text-slate-600">Fetching available tenants...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to Load Tenants</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={fetchClients} className="w-full">
                Retry
              </Button>
              <Button variant="outline" onClick={onManageTenants} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Select Tenant</CardTitle>
              <p className="text-slate-600">Choose a tenant to manage</p>
            </div>
            <Button variant="outline" onClick={onManageTenants}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Favorites */}
          {favoriteClients.length > 0 && (
            <div className="space-y-3">
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
                            <Badge variant={client.Status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                              {client.Status}
                            </Badge>
                          </div>
                        </div>
                        <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Tenants */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">
              {favoriteClients.length > 0 ? "All Tenants" : "Available Tenants"} ({filteredClients.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {otherClients.map(client => (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-slate-50"
                  onClick={() => handleTenantSelect(client)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
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
                          <Badge variant={client.Status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                            {client.Status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Found</h3>
              <p className="text-slate-600">
                {searchTerm ? "No tenants match your search criteria." : "No tenants are available."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
