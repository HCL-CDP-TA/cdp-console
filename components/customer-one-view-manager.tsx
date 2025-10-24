"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { RefreshCw, Save, Edit2, Trash2, GripVertical, CheckCircle, AlertCircle, Eye, Plus, Check, ChevronsUpDown } from "lucide-react"
import { Tenant } from "@/types/tenant"
import { validateAuthState, getAuthState } from "@/lib/auth"
import { trackError, trackAPICall, trackUserAction } from "@/lib/analytics"

interface CustomerOneViewManagerProps {
  tenant: Tenant
  onAuthExpired?: () => void
}

interface MappingItem {
  id: string
  key: string // Mapped Profile Attribute
  value: string // Property Name
}

// Sortable row component
const SortableRow = ({
  item,
  onEdit,
  onDelete,
}: {
  item: MappingItem
  onEdit: (item: MappingItem) => void
  onDelete: (item: MappingItem) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={`${isDragging ? "z-50" : ""} hover:bg-slate-50`}>
      <TableCell>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 hover:bg-slate-100 rounded">
          <GripVertical className="h-4 w-4 text-slate-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{item.value}</TableCell>
      <TableCell>{item.key}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(item)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export const CustomerOneViewManager = ({ tenant, onAuthExpired }: CustomerOneViewManagerProps) => {
  const [mappings, setMappings] = useState<MappingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [coreApiToken, setCoreApiToken] = useState<string | null>(null)
  const [userProperties, setUserProperties] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MappingItem | null>(null)
  const [dialogPropertyName, setDialogPropertyName] = useState("")
  const [dialogMappedAttribute, setDialogMappedAttribute] = useState("")
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const getCoreApiToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check auth state first
      const authResult = await validateAuthState()
      if (!authResult.isValid) {
        console.error("Auth validation failed")
        if (onAuthExpired) {
          onAuthExpired()
        }
        return null
      }

      // Check if we have stored Core API credentials
      const storedTenant = JSON.parse(localStorage.getItem(`tenant-${tenant.id}`) || "{}")
      if (storedTenant.coreApiUsername && storedTenant.coreApiPassword) {
        console.log("Customer One View - Using stored Core API credentials:", {
          username: storedTenant.coreApiUsername,
          hasStoredPassword: !!storedTenant.coreApiPassword,
          timestamp: new Date().toISOString(),
        })

        // Try to authenticate with stored credentials (already hashed)
        const response = await fetch("/api/core-auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: storedTenant.coreApiUsername,
            password: storedTenant.coreApiPassword,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const token = data.access_token
          if (token) {
            setCoreApiToken(token)
            return token
          }
        }
      }

      // If no stored credentials or authentication failed
      console.error("No Core API credentials found for tenant")
      setErrorMessage(
        "Core API credentials required. Please configure them in Data Mappings → Offline Data Sources first.",
      )
      return null
    } catch (error) {
      console.error("Error getting Core API token:", error)
      setErrorMessage("Authentication error")
      return null
    }
  }, [tenant.id, onAuthExpired])

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      console.log("Fetching Customer One View mappings for tenant:", tenant.clientId)

      // Get or reuse Core API token
      let token = coreApiToken
      if (!token) {
        token = await getCoreApiToken()
        if (!token) {
          return // Error already set by getCoreApiToken
        }
      }

      // Now fetch Customer One View data
      const customerOneViewResponse = await fetch(`/api/customer-one-view/${tenant.clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (customerOneViewResponse.ok) {
        const data = await customerOneViewResponse.json()
        console.log("Received Customer One View data:", JSON.stringify(data, null, 2))

        // Transform the data into mapping items
        // Handle different possible response structures
        let dataPointMapping = null

        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          dataPointMapping = data.data[0].DataPointMapping
          console.log("DataPointMapping from data.data[0]:", dataPointMapping)
        } else if (data.DataPointMapping) {
          dataPointMapping = data.DataPointMapping
          console.log("DataPointMapping from root:", dataPointMapping)
        } else if (data.data && data.data.DataPointMapping) {
          dataPointMapping = data.data.DataPointMapping
          console.log("DataPointMapping from data.DataPointMapping:", dataPointMapping)
        }

        if (dataPointMapping) {
          let parsedMapping: Record<string, string> = {}

          try {
            // Check if it's already an object or needs parsing
            if (typeof dataPointMapping === "string") {
              console.log("Parsing DataPointMapping string:", dataPointMapping)
              parsedMapping = JSON.parse(dataPointMapping)
            } else if (typeof dataPointMapping === "object") {
              console.log("DataPointMapping is already an object:", dataPointMapping)
              parsedMapping = dataPointMapping
            }

            console.log("Parsed mapping:", parsedMapping)
          } catch (error) {
            console.error("Failed to parse DataPointMapping:", error)
            console.error("DataPointMapping value:", dataPointMapping)
            setErrorMessage("Failed to parse mapping data")
            return
          }

          // Convert to array maintaining order
          const mappingItems: MappingItem[] = Object.entries(parsedMapping).map(([key, value], index) => ({
            id: `mapping-${index}`,
            key,
            value,
          }))

          setMappings(mappingItems)
          console.log("Processed mapping items:", mappingItems)
        } else {
          console.log("No DataPointMapping found in response, setting empty mappings")
          setMappings([])
        }

        trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "GET", true)
      } else {
        console.error("Failed to fetch Customer One View mappings:", customerOneViewResponse.statusText)
        setErrorMessage(`Failed to fetch mappings: ${customerOneViewResponse.statusText}`)
        trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "GET", false)
        trackError(
          "api_error",
          `Failed to fetch Customer One View mappings: ${customerOneViewResponse.statusText}`,
          "customer-one-view-manager",
        )
      }
    } catch (error) {
      console.error("Error fetching Customer One View mappings:", error)
      setErrorMessage("An unexpected error occurred while fetching mappings")
      trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "GET", false)
      trackError("network_error", `Error fetching Customer One View mappings: ${error}`, "customer-one-view-manager")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.clientId, coreApiToken, getCoreApiToken])

  const saveMappings = useCallback(async () => {
    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      console.log("Saving Customer One View mappings for tenant:", tenant.clientId)

      // Get or reuse Core API token
      let token = coreApiToken
      if (!token) {
        token = await getCoreApiToken()
        if (!token) {
          return // Error already set by getCoreApiToken
        }
      }

      // Convert mappings array back to object, preserving order
      const mappingData: Record<string, string> = {}
      mappings.forEach(item => {
        mappingData[item.key] = item.value
      })

      const payload = {
        data: {
          mappingData,
        },
      }

      console.log("Saving payload:", JSON.stringify(payload, null, 2))
      console.log(
        "Mapping order:",
        mappings.map(m => m.key),
      )

      const response = await fetch(`/api/customer-one-view/${tenant.clientId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setSuccessMessage("Customer One View mappings saved successfully")
        trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "POST", true)
        trackUserAction("save_customer_one_view_mappings", { mappingCount: mappings.length })
      } else {
        const errorText = await response.text()
        console.error("Failed to save Customer One View mappings:", response.statusText, errorText)
        setErrorMessage(`Failed to save mappings: ${response.statusText}`)
        trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "POST", false)
        trackError(
          "api_error",
          `Failed to save Customer One View mappings: ${response.statusText}`,
          "customer-one-view-manager",
        )
      }
    } catch (error) {
      console.error("Error saving Customer One View mappings:", error)
      setErrorMessage("An unexpected error occurred while saving mappings")
      trackAPICall(`/api/customer-one-view/${tenant.clientId}`, "POST", false)
      trackError("network_error", `Error saving Customer One View mappings: ${error}`, "customer-one-view-manager")
    } finally {
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings, tenant.clientId, coreApiToken, getCoreApiToken])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setMappings(items => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // Update IDs to maintain order
        const updatedItems = newItems.map((item: MappingItem, index: number) => ({
          ...item,
          id: `mapping-${index}`,
        }))

        trackUserAction("reorder_customer_one_view_mappings", {
          fromIndex: oldIndex,
          toIndex: newIndex,
          totalItems: updatedItems.length,
        })

        return updatedItems
      })
    }
  }, [])

  const fetchUserProperties = useCallback(async () => {
    try {
      console.log("Fetching user properties for tenant:", tenant.id)
      const response = await fetch(`/api/user-properties/${tenant.id}`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      console.log("User properties response:", response.status, response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("User properties raw data:", data)
        const properties = data.map((prop: any) => prop.dmpDataPointCode).filter((p: any) => p)
        console.log("Extracted user properties:", properties)
        setUserProperties(properties)
      } else {
        console.error("Failed to fetch user properties:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching user properties:", error)
    }
  }, [tenant.id, tenant.apiKey, tenant.apiEndpoint])

  const handleAdd = useCallback(() => {
    console.log("Opening add dialog, available user properties:", userProperties.length)
    console.log("User properties sample:", userProperties.slice(0, 5))
    setEditingItem(null)
    setDialogPropertyName("")
    setDialogMappedAttribute("")
    setIsDialogOpen(true)
  }, [userProperties])

  const handleEdit = useCallback((item: MappingItem) => {
    setEditingItem(item)
    setDialogPropertyName(item.value)
    setDialogMappedAttribute(item.key)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback((item: MappingItem) => {
    setMappings(items => items.filter(i => i.id !== item.id))
    trackUserAction("delete_customer_one_view_mapping", { key: item.key })
  }, [])

  const handleDialogSave = useCallback(() => {
    if (!dialogPropertyName || !dialogMappedAttribute) {
      return
    }

    if (editingItem) {
      // Edit existing
      setMappings(items =>
        items.map(item =>
          item.id === editingItem.id ? { ...item, key: dialogMappedAttribute, value: dialogPropertyName } : item,
        ),
      )
      trackUserAction("edit_customer_one_view_mapping", { key: dialogMappedAttribute })
    } else {
      // Add new
      const newItem: MappingItem = {
        id: `mapping-${mappings.length}`,
        key: dialogMappedAttribute,
        value: dialogPropertyName,
      }
      setMappings(items => [...items, newItem])
      trackUserAction("add_customer_one_view_mapping", { key: dialogMappedAttribute })
    }

    setIsDialogOpen(false)
    setEditingItem(null)
    setDialogPropertyName("")
    setDialogMappedAttribute("")
  }, [dialogPropertyName, dialogMappedAttribute, editingItem, mappings.length])

  const handleDialogCancel = useCallback(() => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setDialogPropertyName("")
    setDialogMappedAttribute("")
  }, [])

  useEffect(() => {
    fetchMappings()
    fetchUserProperties()
  }, [fetchMappings, fetchUserProperties])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer One View</h2>
          <p className="text-slate-600">Manage customer data point mappings for {tenant.name}</p>
          <p className="text-sm text-slate-500 mt-1">
            Note: Core API credentials must be configured in Data Mappings first
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Mapping
          </Button>
          <Button variant="outline" onClick={fetchMappings} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={saveMappings} disabled={saving || mappings.length === 0} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="pr-8 text-green-700">{successMessage}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-green-600 hover:text-green-700"
            onClick={() => setSuccessMessage(null)}>
            ×
          </Button>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="pr-8 text-red-700">{errorMessage}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-red-600 hover:text-red-700"
            onClick={() => setErrorMessage(null)}>
            ×
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Data Point Mappings ({mappings.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              Loading mappings...
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Eye className="h-8 w-8 mx-auto mb-4 text-slate-300" />
              <p>No customer one view mappings found.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Property Name</TableHead>
                      <TableHead>Mapped Profile Attribute</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={mappings.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {mappings.map(item => (
                        <SortableRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Mapping" : "Add Mapping"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the property name and mapped profile attribute."
                : "Add a new property mapping for Customer One View."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name (Display Name)</Label>
              <Input
                id="propertyName"
                placeholder="e.g., User Id, First Name, Email"
                value={dialogPropertyName}
                onChange={e => setDialogPropertyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mappedAttribute">Mapped Profile Attribute</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between">
                    {dialogMappedAttribute || "Select a user property..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search user properties..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No user property found.</CommandEmpty>
                      <CommandGroup>
                        {userProperties.length > 0 ? (
                          userProperties.map(property => (
                            <CommandItem
                              key={property}
                              value={property}
                              onSelect={currentValue => {
                                setDialogMappedAttribute(currentValue)
                                setComboboxOpen(false)
                              }}>
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  dialogMappedAttribute === property ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {property}
                            </CommandItem>
                          ))
                        ) : (
                          <CommandItem disabled>Loading properties...</CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {userProperties.length === 0 && (
                <p className="text-sm text-red-600">
                  No user properties available. Please add user properties in the User Properties tab first.
                </p>
              )}
              <p className="text-xs text-slate-500">{userProperties.length} properties available</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogCancel}>
              Cancel
            </Button>
            <Button onClick={handleDialogSave} disabled={!dialogPropertyName || !dialogMappedAttribute}>
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
