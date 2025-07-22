"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { TenantManager } from "@/components/tenant-manager"
import { UserPropertiesManager } from "@/components/user-properties-manager"
import { DataMappingsManager } from "@/components/data-mappings-manager"
import { trackNavigation, trackTenantSelection, trackAuthentication } from "@/lib/analytics"
import { ChannelPriority } from "@/components/channel-priority"
import { Dashboard } from "@/components/dashboard"
import { LoginForm } from "@/components/login-form"
import { UserManagement } from "@/components/user-management"
import { Tenant } from "@/types/tenant"
import { getAuthState, clearAuthState } from "@/lib/auth"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUsername, setAuthUsername] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  // Wrapper function for tracking navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    trackNavigation(tab, selectedTenant?.clientId)
  }

  // Wrapper function for tracking tenant selection
  const handleTenantSelection = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    trackTenantSelection(tenant.clientId, tenant.name)
  }

  useEffect(() => {
    const authState = getAuthState()
    setIsAuthenticated(authState.isAuthenticated)
    setAuthUsername(authState.username)

    const storedTenants = localStorage.getItem("cdp-tenants")
    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants)
      setTenants(parsedTenants)
      if (parsedTenants.length > 0) {
        setSelectedTenant(parsedTenants[0])
      }
    }
  }, [])

  const handleLoginSuccess = () => {
    const authState = getAuthState()
    setIsAuthenticated(true)
    setAuthUsername(authState.username)
  }

  const handleLogout = () => {
    trackAuthentication("logout")
    clearAuthState()
    setIsAuthenticated(false)
    setAuthUsername(null)
  }

  const saveTenants = (updatedTenants: Tenant[]) => {
    setTenants(updatedTenants)
    localStorage.setItem("cdp-tenants", JSON.stringify(updatedTenants))
  }

  const addTenant = (tenant: Tenant) => {
    const updatedTenants = [...tenants, tenant]
    saveTenants(updatedTenants)
    if (!selectedTenant) {
      setSelectedTenant(tenant)
    }
  }

  const updateTenant = (updatedTenant: Tenant) => {
    const updatedTenants = tenants.map(t => (t.id === updatedTenant.id ? updatedTenant : t))
    saveTenants(updatedTenants)
    if (selectedTenant?.id === updatedTenant.id) {
      setSelectedTenant(updatedTenant)
    }
  }

  const deleteTenant = (tenantId: string) => {
    const updatedTenants = tenants.filter(t => t.id !== tenantId)
    saveTenants(updatedTenants)
    if (selectedTenant?.id === tenantId) {
      setSelectedTenant(updatedTenants[0] || null)
    }
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-slate-900">CDP Console</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-slate-600 text-sm">Welcome, {authUsername}</p>
        </div>

        {/* Tenant List */}
        {tenants.length > 0 && (
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Tenants ({tenants.length})</h4>
              <Button variant="ghost" size="sm" onClick={() => handleTabChange("tenants")} className="h-6 px-2 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {tenants.map(tenant => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelection(tenant)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTenant?.id === tenant.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">{tenant.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate pl-6">{tenant.clientId}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button
              onClick={() => handleTabChange("dashboard")}
              disabled={!selectedTenant}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : selectedTenant
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-400 cursor-not-allowed"
              }`}>
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange("tenants")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "tenants"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-700 hover:bg-slate-50"
              }`}>
              <Building2 className="h-4 w-4" />
              Tenant Management
            </button>
            <button
              onClick={() => handleTabChange("properties")}
              disabled={!selectedTenant}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "properties"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : selectedTenant
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-400 cursor-not-allowed"
              }`}>
              <Database className="h-4 w-4" />
              User Properties
            </button>
            <button
              onClick={() => handleTabChange("mappings")}
              disabled={!selectedTenant}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "mappings"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : selectedTenant
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-400 cursor-not-allowed"
              }`}>
              <ArrowLeftRight className="h-4 w-4" />
              Data Mappings
            </button>
            <button
              onClick={() => handleTabChange("users")}
              disabled={!selectedTenant}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : selectedTenant
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-400 cursor-not-allowed"
              }`}>
              <Users className="h-4 w-4" />
              User Management
            </button>
            <button
              onClick={() => handleTabChange("channel-priority")}
              disabled={!selectedTenant}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "channel-priority"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : selectedTenant
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-400 cursor-not-allowed"
              }`}>
              <ArrowDown10 className="h-4 w-4" />
              Channel Priority
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === "dashboard" && (
            <>
              {selectedTenant ? (
                <Dashboard tenant={selectedTenant} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
                    <p className="text-slate-600 mb-4">Please select a tenant to view dashboard metrics</p>
                    <Button onClick={() => handleTabChange("tenants")}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "tenants" && (
            <TenantManager
              tenants={tenants}
              selectedTenant={selectedTenant}
              onAddTenant={addTenant}
              onUpdateTenant={updateTenant}
              onDeleteTenant={deleteTenant}
              onSelectTenant={setSelectedTenant}
              onAuthExpired={() => {
                setIsAuthenticated(false)
                setAuthUsername(null)
              }}
            />
          )}

          {activeTab === "properties" && (
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
                    <Button onClick={() => handleTabChange("tenants")}>Select Tenant</Button>
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
                    <Button onClick={() => handleTabChange("tenants")}>Select Tenant</Button>
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
                    <Button onClick={() => handleTabChange("tenants")}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "channel-priority" && (
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
                    <Button onClick={() => handleTabChange("tenants")}>Select Tenant</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
