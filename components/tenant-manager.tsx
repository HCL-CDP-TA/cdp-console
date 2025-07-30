"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit2, Trash2, Building2, Key, Globe, User, Eye, EyeOff } from "lucide-react"
import { Tenant, Client } from "@/types/tenant"
import { getAuthState } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  trackDataManagement,
  trackError,
  trackAPICall,
  trackFormInteraction,
  trackDetailedUserAction,
} from "@/lib/analytics"

interface TenantFormProps {
  formData: {
    name: string
    apiKey: string
    clientId: string
    apiEndpoint: string
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string
      apiKey: string
      clientId: string
      apiEndpoint: string
    }>
  >
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  editingTenant: Tenant | null
  onClientSelect?: (client: Client) => void
  onAuthExpired?: () => void
}

const TenantForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  editingTenant,
  onClientSelect,
  onAuthExpired,
}: TenantFormProps) => {
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showClientSelect, setShowClientSelect] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const fetchClients = async () => {
    setLoadingClients(true)
    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
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
        setShowClientSelect(true)
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        console.error("Failed to fetch clients:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id.toString() === clientId)
    if (selectedClient && onClientSelect) {
      onClientSelect(selectedClient)
      setShowClientSelect(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!editingTenant && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Quick Setup</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchClients}
              disabled={loadingClients}
              className="flex items-center gap-2">
              {loadingClients ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Load Clients
            </Button>
          </div>
          {showClientSelect && clients.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border">
              <Label htmlFor="clientSelect" className="text-sm font-medium mb-2 block">
                Select a client to pre-populate fields:
              </Label>
              <Select onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{client.DisplayName}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-slate-500">ID: {client.id}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              client.Status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                            {client.Status}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tenant Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter tenant name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={formData.clientId}
            onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
            placeholder="Enter client ID"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={formData.apiEndpoint}
            onChange={e => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
            placeholder="https://api.example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showPassword ? "text" : "password"}
              value={formData.apiKey}
              onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter API key"
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editingTenant ? "Update" : "Create"} Tenant</Button>
      </div>
    </form>
  )
}

interface TenantManagerProps {
  tenants: Tenant[]
  selectedTenant: Tenant | null
  onAddTenant: (tenant: Tenant) => void
  onUpdateTenant: (tenant: Tenant) => void
  onDeleteTenant: (tenantId: string) => void
  onSelectTenant: (tenant: Tenant) => void
  onAuthExpired?: () => void
}

export const TenantManager = ({
  tenants,
  selectedTenant,
  onAddTenant,
  onUpdateTenant,
  onDeleteTenant,
  onSelectTenant,
  onAuthExpired,
}: TenantManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "",
    clientId: "",
    apiEndpoint: process.env.NEXT_PUBLIC_DEFAULT_API_ENDPOINT || "",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || "",
      clientId: "",
      apiEndpoint: process.env.NEXT_PUBLIC_DEFAULT_API_ENDPOINT || "",
    })
  }

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      name: client.DisplayName,
      clientId: client.id.toString(),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    const isEditing = !!editingTenant
    trackFormInteraction(isEditing ? "edit" : "add", "tenant", "submit")

    if (editingTenant) {
      trackDataManagement("update", "tenant" as any, {
        tenantName: formData.name,
        tenantId: formData.clientId,
      })
      onUpdateTenant({
        ...editingTenant,
        ...formData,
        updatedAt: now,
      })
      setIsEditDialogOpen(false)
      setEditingTenant(null)
    } else {
      trackDataManagement("create", "tenant" as any, {
        tenantName: formData.name,
        tenantId: formData.clientId,
      })
      onAddTenant({
        id: crypto.randomUUID(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      })
      setIsAddDialogOpen(false)
    }
    resetForm()
  }

  const handleEdit = (tenant: Tenant) => {
    trackDetailedUserAction("edit", "tenant", {
      tenantName: tenant.name,
      tenantId: tenant.clientId,
    })
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      apiKey: tenant.apiKey,
      clientId: tenant.clientId,
      apiEndpoint: tenant.apiEndpoint,
    })
    setIsEditDialogOpen(true)
  }

  const handleCancel = () => {
    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingTenant(null)
    resetForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenant Management</h2>
          <p className="text-slate-600">Manage your CDP tenant configurations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <TenantForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              editingTenant={editingTenant}
              onClientSelect={handleClientSelect}
              onAuthExpired={onAuthExpired}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.map(tenant => (
          <Card
            key={tenant.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedTenant?.id === tenant.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-slate-50"
            }`}
            onClick={() => onSelectTenant(tenant)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-600" />
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleEdit(tenant)
                    }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => e.stopPropagation()}
                        className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{tenant.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            trackDataManagement("delete", "tenant" as any, {
                              tenantName: tenant.name,
                              tenantId: tenant.clientId,
                            })
                            onDeleteTenant(tenant.id)
                          }}
                          className="bg-red-600 hover:bg-red-700">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>Client ID:</span>
                <Badge variant="outline" className="text-xs">
                  {tenant.clientId}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Globe className="h-4 w-4" />
                <span className="truncate">{tenant.apiEndpoint}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Key className="h-4 w-4" />
                <span>API Key:</span>
                <span className="font-mono">{tenant.apiKey.substring(0, 8)}...</span>
              </div>
              <div className="text-xs text-slate-500">Updated: {new Date(tenant.updatedAt).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenants Found</h3>
            <p className="text-slate-600 mb-4">Create your first tenant to get started with CDP management</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Tenant</DialogTitle>
                </DialogHeader>
                <TenantForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  editingTenant={editingTenant}
                  onClientSelect={handleClientSelect}
                  onAuthExpired={onAuthExpired}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <TenantForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            editingTenant={editingTenant}
            onClientSelect={handleClientSelect}
            onAuthExpired={onAuthExpired}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
