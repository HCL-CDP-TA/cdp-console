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
import { Checkbox } from "@/components/ui/checkbox"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCw,
  Save,
  Edit2,
  Trash2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Check,
  ChevronsUpDown,
  BookmarkPlus,
  BookOpen,
  Lock,
  LockOpen,
  Copy,
  Shield,
} from "lucide-react"
import { Tenant } from "@/types/tenant"
import { trackError, trackAPICall, trackUserAction } from "@/lib/analytics"

interface CustomerOneViewManagerProps {
  tenant: Tenant
  onAuthExpired?: () => void
}

interface MappingItem {
  id: string
  key: string
  value: string
}

interface CovTemplate {
  name: string
  mappings: { key: string; value: string }[]
  createdAt: string
  type: "master" | "user"
  description?: string
}

// Sortable row component
const SortableRow = ({
  item,
  onEdit,
  onDelete,
  isInvalid,
}: {
  item: MappingItem
  onEdit: (item: MappingItem) => void
  onDelete: (item: MappingItem) => void
  isInvalid?: boolean
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-50" : ""} ${isInvalid ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}>
      <TableCell>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 hover:bg-slate-100 rounded">
          <GripVertical className="h-4 w-4 text-slate-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{item.value}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {isInvalid && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          <span className={isInvalid ? "text-red-700" : ""}>{item.key}</span>
        </div>
      </TableCell>
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
  const [coreApiNotConfigured, setCoreApiNotConfigured] = useState(false)
  const [userProperties, setUserProperties] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MappingItem | null>(null)
  const [dialogPropertyName, setDialogPropertyName] = useState("")
  const [dialogMappedAttribute, setDialogMappedAttribute] = useState("")
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [templates, setTemplates] = useState<CovTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false)
  const [isLoadTemplateDialogOpen, setIsLoadTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveTemplateFilter, setSaveTemplateFilter] = useState("")
  const [loadTemplateFilter, setLoadTemplateFilter] = useState("")

  // Admin mode
  const [adminMode, setAdminMode] = useState(false)
  const [adminPassword, setAdminPin] = useState("")
  const [adminPasswordInput, setAdminPinInput] = useState("")
  const [adminPasswordError, setAdminPasswordError] = useState("")
  const [isAdminUnlockDialogOpen, setIsAdminUnlockDialogOpen] = useState(false)
  const [verifyingPassword, setVerifyingPin] = useState(false)

  // Editing master template state
  const [editingMasterTemplate, setEditingMasterTemplate] = useState<string | null>(null)
  const [saveAsMaster, setSaveAsMaster] = useState(false)

  // Copy master dialog
  const [isCopyMasterDialogOpen, setIsCopyMasterDialogOpen] = useState(false)
  const [copyMasterSource, setCopyMasterSource] = useState<CovTemplate | null>(null)
  const [copyMasterName, setCopyMasterName] = useState("")
  const [isCopyingMaster, setIsCopyingMaster] = useState(false)

  // Delete master confirm
  const [masterToDelete, setMasterToDelete] = useState<string | null>(null)
  const [isDeletingMaster, setIsDeletingMaster] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const storedPin = sessionStorage.getItem("cov-admin-password")
    if (storedPin) {
      setAdminMode(true)
      setAdminPin(storedPin)
    }
  }, [])

  const masterTemplates = templates.filter(t => t.type === "master")
  const userTemplates = templates.filter(t => t.type === "user")

  const invalidMappingKeys =
    userProperties.length > 0
      ? Array.from(new Set(mappings.filter(m => !userProperties.includes(m.key)).map(m => m.key)))
      : []
  const hasInvalidMappings = invalidMappingKeys.length > 0

  const getCoreApiToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/core-auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id }),
      })

      if (response.status === 403) {
        setCoreApiNotConfigured(true)
        return null
      }

      if (!response.ok) {
        setErrorMessage("Core API authentication failed")
        return null
      }

      const data = await response.json()
      const token = data.access_token
      setCoreApiToken(token)
      return token
    } catch (error) {
      console.error("Error getting Core API token:", error)
      setErrorMessage("Core API authentication error")
      return null
    }
  }, [tenant.id])

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      console.log("Fetching Customer One View mappings for tenant:", tenant.clientId)

      let token = coreApiToken
      if (!token) {
        token = await getCoreApiToken()
        if (!token) {
          return
        }
      }

      const customerOneViewResponse = await fetch(`/api/customer-one-view/${tenant.clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (customerOneViewResponse.ok) {
        const data = await customerOneViewResponse.json()
        console.log("Received Customer One View data:", JSON.stringify(data, null, 2))

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

      let token = coreApiToken
      if (!token) {
        token = await getCoreApiToken()
        if (!token) {
          return
        }
      }

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

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch(`/api/cov-templates/${tenant.id}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error fetching COV templates:", error)
    } finally {
      setLoadingTemplates(false)
    }
  }, [tenant.id])

  const handleVerifyPin = useCallback(async () => {
    if (!adminPasswordInput.trim()) return
    setVerifyingPin(true)
    setAdminPasswordError("")
    try {
      const response = await fetch(`/api/cov-templates/${tenant.id}/masters/verify`, {
        headers: { "x-master-password": adminPasswordInput },
      })
      if (response.ok) {
        setAdminMode(true)
        setAdminPin(adminPasswordInput)
        sessionStorage.setItem("cov-admin-password", adminPasswordInput)
        setIsAdminUnlockDialogOpen(false)
        setAdminPinInput("")
      } else {
        setAdminPasswordError("Incorrect password")
      }
    } catch {
      setAdminPasswordError("Failed to verify PIN")
    } finally {
      setVerifyingPin(false)
    }
  }, [adminPasswordInput, tenant.id])

  const handleExitAdminMode = useCallback(() => {
    setAdminMode(false)
    setAdminPin("")
    sessionStorage.removeItem("cov-admin-password")
    setEditingMasterTemplate(null)
    setSaveAsMaster(false)
  }, [])

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)

    if (saveAsMaster) {
      try {
        const response = await fetch(`/api/cov-templates/${tenant.id}/masters`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-master-password": adminPassword,
          },
          body: JSON.stringify({
            name: templateName.trim(),
            mappings: mappings.map(m => ({ key: m.key, value: m.value })),
          }),
        })
        if (response.ok) {
          setSuccessMessage(`Master template "${templateName.trim()}" saved`)
          setIsSaveTemplateDialogOpen(false)
          setTemplateName("")
          setSaveAsMaster(false)
          if (editingMasterTemplate) setEditingMasterTemplate(null)
        } else {
          setErrorMessage("Failed to save master template")
        }
      } catch {
        setErrorMessage("Failed to save master template")
      } finally {
        setSavingTemplate(false)
      }
      return
    }

    try {
      const response = await fetch(`/api/cov-templates/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          mappings: mappings.map(m => ({ key: m.key, value: m.value })),
        }),
      })
      if (response.ok) {
        setSuccessMessage(`Template "${templateName.trim()}" saved successfully`)
        setIsSaveTemplateDialogOpen(false)
        setTemplateName("")
        trackUserAction("save_cov_template", { templateName: templateName.trim(), mappingCount: mappings.length })
      } else if (response.status === 400) {
        const data = await response.json()
        setErrorMessage(data.error || "Failed to save template")
      } else {
        setErrorMessage("Failed to save template")
      }
    } catch {
      setErrorMessage("Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }, [templateName, mappings, tenant.id, saveAsMaster, adminPassword, editingMasterTemplate])

  const handleLoadTemplate = useCallback((template: CovTemplate) => {
    const loadedMappings: MappingItem[] = template.mappings.map((m, index) => ({
      id: `mapping-${index}`,
      key: m.key,
      value: m.value,
    }))
    setMappings(loadedMappings)
    setIsLoadTemplateDialogOpen(false)
    setSuccessMessage(`Template "${template.name}" loaded. Apply Changes to persist to CDP.`)
    trackUserAction("load_cov_template", { templateName: template.name, mappingCount: template.mappings.length })
  }, [])

  const handleDeleteTemplate = useCallback(
    async (name: string) => {
      try {
        const response = await fetch(`/api/cov-templates/${tenant.id}/${encodeURIComponent(name)}`, {
          method: "DELETE",
        })
        if (response.ok) {
          setTemplates(prev => prev.filter(t => t.name !== name))
          trackUserAction("delete_cov_template", { templateName: name })
        } else {
          setErrorMessage("Failed to delete template")
        }
      } catch (error) {
        console.error("Error deleting COV template:", error)
        setErrorMessage("Failed to delete template")
      }
    },
    [tenant.id],
  )

  const handleOpenCopyMaster = useCallback((template: CovTemplate) => {
    setCopyMasterSource(template)
    setCopyMasterName(`${template.name} (copy)`)
    setIsCopyMasterDialogOpen(true)
  }, [])

  const handleConfirmCopyMaster = useCallback(async () => {
    if (!copyMasterSource || !copyMasterName.trim()) return
    setIsCopyingMaster(true)
    try {
      const response = await fetch(`/api/cov-templates/${tenant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyMasterName.trim(),
          mappings: copyMasterSource.mappings,
        }),
      })
      if (response.ok) {
        setSuccessMessage(`Copied "${copyMasterSource.name}" as "${copyMasterName.trim()}"`)
        setIsCopyMasterDialogOpen(false)
        setCopyMasterSource(null)
        setCopyMasterName("")
        await fetchTemplates()
        trackUserAction("copy_master_cov_template", {
          sourceName: copyMasterSource.name,
          newName: copyMasterName.trim(),
        })
      } else if (response.status === 400) {
        const data = await response.json()
        setErrorMessage(data.error || "Failed to copy template")
      } else {
        setErrorMessage("Failed to copy template")
      }
    } catch {
      setErrorMessage("Failed to copy template")
    } finally {
      setIsCopyingMaster(false)
    }
  }, [copyMasterSource, copyMasterName, tenant.id, fetchTemplates])

  const handleEditMaster = useCallback((template: CovTemplate) => {
    const loadedMappings: MappingItem[] = template.mappings.map((m, index) => ({
      id: `mapping-${index}`,
      key: m.key,
      value: m.value,
    }))
    setMappings(loadedMappings)
    setEditingMasterTemplate(template.name)
    setIsLoadTemplateDialogOpen(false)
    setSuccessMessage(`Loaded master template "${template.name}" for editing.`)
  }, [])

  const handleConfirmDeleteMaster = useCallback(async () => {
    if (!masterToDelete) return
    setIsDeletingMaster(true)
    try {
      const response = await fetch(`/api/cov-templates/${tenant.id}/masters/${encodeURIComponent(masterToDelete)}`, {
        method: "DELETE",
        headers: { "x-master-password": adminPassword },
      })
      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.name !== masterToDelete))
        setSuccessMessage(`Master template "${masterToDelete}" deleted`)
        setMasterToDelete(null)
        trackUserAction("delete_master_cov_template", { templateName: masterToDelete })
      } else {
        setErrorMessage("Failed to delete master template")
      }
    } catch {
      setErrorMessage("Failed to delete master template")
    } finally {
      setIsDeletingMaster(false)
    }
  }, [masterToDelete, tenant.id, adminPassword])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setMappings(items => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

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

  const handleDialogSave = useCallback(
    (keepOpen = false) => {
      if (!dialogPropertyName || !dialogMappedAttribute) {
        return
      }

      if (editingItem) {
        setMappings(items =>
          items.map(item =>
            item.id === editingItem.id ? { ...item, key: dialogMappedAttribute, value: dialogPropertyName } : item,
          ),
        )
        trackUserAction("edit_customer_one_view_mapping", { key: dialogMappedAttribute })
      } else {
        const newItem: MappingItem = {
          id: `mapping-${mappings.length}`,
          key: dialogMappedAttribute,
          value: dialogPropertyName,
        }
        setMappings(items => [...items, newItem])
        trackUserAction("add_customer_one_view_mapping", { key: dialogMappedAttribute })
      }

      if (keepOpen && !editingItem) {
        setDialogPropertyName("")
        setDialogMappedAttribute("")
      } else {
        setIsDialogOpen(false)
        setEditingItem(null)
        setDialogPropertyName("")
        setDialogMappedAttribute("")
      }
    },
    [dialogPropertyName, dialogMappedAttribute, editingItem, mappings.length],
  )

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

  if (coreApiNotConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <p>Customer One View is not configured for this tenant.</p>
        <p className="text-sm">Contact your administrator to set up Core API access.</p>
      </div>
    )
  }

  const saveNameMatchesMaster = masterTemplates.some(t => t.name === templateName.trim())

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customer One View</h2>
            <p className="text-slate-600">Manage Customer One View - Basic Details view for {tenant.displayName}</p>
          </div>
          {adminMode && (
            <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs font-medium">
              <Shield className="h-3 w-3" />
              Admin mode
            </div>
          )}
        </div>

        {editingMasterTemplate && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
            <Shield className="h-4 w-4 shrink-0" />
            <span>
              Editing master template: <strong>{editingMasterTemplate}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
              onClick={() => setEditingMasterTemplate(null)}>
              Cancel edit
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setTemplateName(editingMasterTemplate || "")
              setSaveTemplateFilter("")
              setSaveAsMaster(adminMode && !!editingMasterTemplate)
              await fetchTemplates()
              setIsSaveTemplateDialogOpen(true)
            }}
            disabled={mappings.length === 0}
            className="flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Save as Template
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setLoadTemplateFilter("")
              await fetchTemplates()
              setIsLoadTemplateDialogOpen(true)
            }}
            className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Load Template
          </Button>
          <Button variant="outline" onClick={fetchMappings} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={saveMappings}
            disabled={saving || mappings.length === 0 || hasInvalidMappings}
            className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Applying..." : "Apply Changes"}
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

      {hasInvalidMappings && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <span className="font-medium">
              {invalidMappingKeys.length} mapping{invalidMappingKeys.length !== 1 ? "s reference" : " references"}{" "}
              {invalidMappingKeys.length !== 1 ? "properties" : "a property"} that{" "}
              {invalidMappingKeys.length !== 1 ? "don't" : "doesn't"} exist in this tenant:
            </span>{" "}
            {invalidMappingKeys.join(", ")}. Remove {invalidMappingKeys.length !== 1 ? "them" : "it"} before applying
            changes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Map Customer One View properties to profile attributes ({mappings.length} total)
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
                        <SortableRow
                          key={item.id}
                          item={item}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isInvalid={invalidMappingKeys.includes(item.key)}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Property Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Property" : "Add Property"}</DialogTitle>
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
            {!editingItem && (
              <Button
                variant="outline"
                onClick={() => handleDialogSave(true)}
                disabled={!dialogPropertyName || !dialogMappedAttribute}>
                Add Another
              </Button>
            )}
            <Button onClick={() => handleDialogSave(false)} disabled={!dialogPropertyName || !dialogMappedAttribute}>
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog
        open={isSaveTemplateDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setSaveTemplateFilter("")
            setSaveAsMaster(false)
          }
          setIsSaveTemplateDialogOpen(open)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Save the current mappings as a reusable template for this tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {adminMode && (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-amber-50 border-amber-200">
                <Checkbox
                  id="saveAsMaster"
                  checked={saveAsMaster}
                  onCheckedChange={v => {
                    setSaveAsMaster(!!v)
                    setTemplateName(v && editingMasterTemplate ? editingMasterTemplate : "")
                  }}
                />
                <Label htmlFor="saveAsMaster" className="text-amber-800 cursor-pointer">
                  {editingMasterTemplate
                    ? `Update master template "${editingMasterTemplate}"`
                    : "Save as master template"}
                </Label>
              </div>
            )}

            {!saveAsMaster && userTemplates.length > 0 && (
              <div className="space-y-2">
                <Label>Overwrite existing template</Label>
                <Input
                  placeholder="Filter templates..."
                  value={saveTemplateFilter}
                  onChange={e => setSaveTemplateFilter(e.target.value)}
                />
                <ScrollArea className="max-h-[160px]">
                  <div className="space-y-1">
                    {userTemplates
                      .filter(t => t.name.toLowerCase().includes(saveTemplateFilter.toLowerCase()))
                      .map(t => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setTemplateName(t.name)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                            templateName === t.name
                              ? "border-slate-900 bg-slate-100 font-medium"
                              : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                          }`}>
                          {t.name}
                          <span className="ml-2 text-slate-400 font-normal">{t.mappings.length} mappings</span>
                        </button>
                      ))}
                    {userTemplates.filter(t => t.name.toLowerCase().includes(saveTemplateFilter.toLowerCase()))
                      .length === 0 && <p className="text-sm text-slate-500 px-3 py-2">No templates match.</p>}
                  </div>
                </ScrollArea>
              </div>
            )}

            {saveAsMaster && masterTemplates.length > 0 && (
              <div className="space-y-2">
                <Label>Existing master templates</Label>
                <ScrollArea className="max-h-[120px]">
                  <div className="space-y-1">
                    {masterTemplates.map(t => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setTemplateName(t.name)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                          templateName === t.name
                            ? "border-amber-600 bg-amber-50 font-medium"
                            : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                        }`}>
                        {t.name}
                        <span className="ml-2 text-slate-400 font-normal">{t.mappings.length} mappings</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="templateName">
                {saveAsMaster
                  ? "Master template name"
                  : userTemplates.length > 0
                    ? "Or save as new template"
                    : "Template Name"}
              </Label>
              <Input
                id="templateName"
                placeholder={saveAsMaster ? "e.g., Banking, Telecoms" : "e.g., Banking Demo, Retail Config"}
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
            </div>

            {!saveAsMaster && saveNameMatchesMaster && (
              <p className="text-sm text-red-600">
                This name belongs to a master template. Use Copy, or choose a different name.
              </p>
            )}
            {!saveAsMaster && templateName.trim() && userTemplates.some(t => t.name === templateName.trim()) && (
              <p className="text-sm text-amber-600">This template will be overwritten.</p>
            )}
            {saveAsMaster && templateName.trim() && masterTemplates.some(t => t.name === templateName.trim()) && (
              <p className="text-sm text-amber-600">This master template will be overwritten.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || savingTemplate || (!saveAsMaster && saveNameMatchesMaster)}>
              {savingTemplate ? "Saving..." : saveAsMaster ? "Save Master Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog
        open={isLoadTemplateDialogOpen}
        onOpenChange={open => {
          if (!open) setLoadTemplateFilter("")
          setIsLoadTemplateDialogOpen(open)
        }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
            <DialogDescription>
              Load a user template to replace editor mappings, or copy a master template.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {loadingTemplates ? (
              <div className="text-center py-8 text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading templates...
              </div>
            ) : (
              <>
                <Input
                  placeholder="Filter templates..."
                  value={loadTemplateFilter}
                  onChange={e => setLoadTemplateFilter(e.target.value)}
                />

                {/* Master Templates Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Master Templates</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                      title={adminMode ? "Exit admin mode" : "Enter admin mode"}
                      onClick={() => {
                        if (adminMode) {
                          handleExitAdminMode()
                        } else {
                          setAdminPinInput("")
                          setAdminPasswordError("")
                          setIsAdminUnlockDialogOpen(true)
                        }
                      }}>
                      {adminMode ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  <ScrollArea className="max-h-[180px]">
                    <div className="space-y-1">
                      {masterTemplates.filter(t => t.name.toLowerCase().includes(loadTemplateFilter.toLowerCase()))
                        .length === 0 ? (
                        <p className="text-sm text-slate-400 px-3 py-2 italic">No master templates.</p>
                      ) : (
                        masterTemplates
                          .filter(t => t.name.toLowerCase().includes(loadTemplateFilter.toLowerCase()))
                          .map(template => (
                            <div
                              key={template.name}
                              className="flex items-center justify-between px-3 py-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100">
                              <div>
                                <p className="font-medium text-sm">{template.name}</p>
                                <p className="text-xs text-slate-500">{template.mappings.length} mappings</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleOpenCopyMaster(template)}>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                {adminMode && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleEditMaster(template)}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-red-600 hover:text-red-700"
                                      onClick={() => {
                                        setMasterToDelete(template.name)
                                        setIsLoadTemplateDialogOpen(false)
                                      }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>

                  {adminMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-dashed border-amber-300 mt-1"
                      onClick={async () => {
                        setIsLoadTemplateDialogOpen(false)
                        setTemplateName("")
                        setSaveAsMaster(true)
                        setSaveTemplateFilter("")
                        await fetchTemplates()
                        setIsSaveTemplateDialogOpen(true)
                      }}>
                      <Plus className="h-3 w-3 mr-1" />
                      New Master Template
                    </Button>
                  )}
                </div>

                {/* User Templates Section */}
                <div className="space-y-1">
                  <div className="py-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Customised Templates
                    </p>
                  </div>

                  <ScrollArea className="max-h-[180px]">
                    <div className="space-y-1">
                      {userTemplates.filter(t => t.name.toLowerCase().includes(loadTemplateFilter.toLowerCase()))
                        .length === 0 ? (
                        <p className="text-sm text-slate-400 px-3 py-2 italic">
                          {userTemplates.length === 0
                            ? 'No templates yet. Use "Save as Template" to create one.'
                            : "No templates match."}
                        </p>
                      ) : (
                        userTemplates
                          .filter(t => t.name.toLowerCase().includes(loadTemplateFilter.toLowerCase()))
                          .map(template => (
                            <div
                              key={template.name}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer group"
                              onClick={() => handleLoadTemplate(template)}>
                              <div>
                                <p className="font-medium text-sm">{template.name}</p>
                                <p className="text-xs text-slate-500">{template.mappings.length} mappings</p>
                              </div>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs opacity-0 group-hover:opacity-100"
                                  onClick={() => handleLoadTemplate(template)}>
                                  Load
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100"
                                  onClick={() => handleDeleteTemplate(template.name)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoadTemplateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Unlock Dialog */}
      <Dialog
        open={isAdminUnlockDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setAdminPinInput("")
            setAdminPasswordError("")
          }
          setIsAdminUnlockDialogOpen(open)
        }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Enter Admin Password
            </DialogTitle>
            <DialogDescription>Enter the password to manage master templates.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={adminPasswordInput}
              onChange={e => {
                setAdminPinInput(e.target.value)
                setAdminPasswordError("")
              }}
              onKeyDown={e => {
                if (e.key === "Enter") handleVerifyPin()
              }}
              autoFocus
            />
            {adminPasswordError && <p className="text-sm text-red-600">{adminPasswordError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdminUnlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPin} disabled={!adminPasswordInput.trim() || verifyingPassword}>
              {verifyingPassword ? "Verifying..." : "Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Master Dialog */}
      <Dialog
        open={isCopyMasterDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setCopyMasterSource(null)
            setCopyMasterName("")
          }
          setIsCopyMasterDialogOpen(open)
        }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Copy &quot;{copyMasterSource?.name}&quot;</DialogTitle>
            <DialogDescription>
              Create a user template from this master template. Your current editor mappings are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="copyMasterName">New template name</Label>
            <Input
              id="copyMasterName"
              value={copyMasterName}
              onChange={e => setCopyMasterName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleConfirmCopyMaster()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyMasterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCopyMaster} disabled={!copyMasterName.trim() || isCopyingMaster}>
              {isCopyingMaster ? "Copying..." : "Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Master Confirm Dialog */}
      <Dialog
        open={!!masterToDelete}
        onOpenChange={open => {
          if (!open) setMasterToDelete(null)
        }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete master template</DialogTitle>
            <DialogDescription>
              This will permanently delete the &quot;{masterToDelete}&quot; master template. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteMaster} disabled={isDeletingMaster}>
              {isDeletingMaster ? "Deleting..." : "Delete master template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
