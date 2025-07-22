"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Edit2, Trash2, MapPin, RefreshCw, Search, Database, Check, ChevronsUpDown } from "lucide-react"
import { Tenant, DataMapping, DataSource } from "@/types/tenant"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { X } from "lucide-react"
import { validateAuthState } from "@/lib/auth"
import {
  trackDataManagement,
  trackError,
  trackAPICall,
  trackFormInteraction,
  trackDetailedUserAction,
  trackSearchFilter,
} from "@/lib/analytics"

interface DataMappingsManagerProps {
  tenant: Tenant
  onAuthExpired?: () => void
}

export function DataMappingsManager({ tenant, onAuthExpired }: DataMappingsManagerProps) {
  const [mappings, setMappings] = useState<DataMapping[]>([])
  const [userProperties, setUserProperties] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [propertySearchOpen, setPropertySearchOpen] = useState(false)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>("analyze_post")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<DataMapping | null>(null)
  const [metadataError, setMetadataError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [formData, setFormData] = useState({
    userProperty: "",
    profileUpdateFunction: "UPDATE",
    isMandatory: false,
    metadata: "{}",
    alternateKeys: [""],
    customMetadata: [{ key: "", value: "" }],
    dataSource: "analyze_post" as DataSource,
  })

  const updateFunctions = [
    "UPDATE",
    "FIRST_SEEN",
    "LAST_SEEN",
    "ARRAY_PREPEND",
    "INCR",
    "CUSTOM_VALUES",
    "IP_TO_GEO",
    "UTM_MATCH",
    "CONDITIONAL_INSERT",
    "CONVERT_EPOCH_TO_DATE",
  ]

  const getApiDataSource = (dataSource: DataSource): string => {
    return dataSource === "dataingestionpi" ? "dataingestionapi" : dataSource
  }

  const fetchMappings = async (dataSource: DataSource) => {
    setLoading(true)
    const apiDataSource = getApiDataSource(dataSource)
    try {
      const response = await fetch(`/api/mappings/${tenant.clientId}/${apiDataSource}`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMappings(data)
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "GET", true)
      } else {
        console.error("Failed to fetch mappings:", response.statusText)
        setMappings([])
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "GET", false)
        trackError("api_error", `Failed to fetch mappings: ${response.statusText}`, "data-mappings-manager")
      }
    } catch (error) {
      console.error("Error fetching mappings:", error)
      setMappings([])
      trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "GET", false)
      trackError("network_error", `Error fetching mappings: ${error}`, "data-mappings-manager")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProperties = async () => {
    setLoadingProperties(true)
    try {
      const response = await fetch(`/api/user-properties/${tenant.clientId}`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        // Extract property names using the correct field from API response
        const propertyNames = data.map((prop: any) => prop.dmpDataPointCode).filter(Boolean)

        setUserProperties(propertyNames)
      } else {
        console.error("Failed to fetch user properties:", response.statusText)
        setUserProperties([])
      }
    } catch (error) {
      console.error("Error fetching user properties:", error)
      setUserProperties([])
    } finally {
      setLoadingProperties(false)
    }
  }

  useEffect(() => {
    fetchMappings(selectedDataSource)
  }, [tenant, selectedDataSource])

  useEffect(() => {
    fetchUserProperties()
  }, [tenant])

  const resetForm = () => {
    setFormData({
      userProperty: "",
      profileUpdateFunction: "UPDATE",
      isMandatory: false,
      metadata: "{}",
      alternateKeys: [""],
      customMetadata: [{ key: "", value: "" }],
      dataSource: "analyze_post" as DataSource,
    })
    setMetadataError("")
  }

  const parseMetadata = (metadata: string) => {
    try {
      const parsed = JSON.parse(metadata)
      return {
        inputCol: parsed.input_col || "",
        alternateKeys: parsed.alternate_keys || [""],
      }
    } catch {
      return {
        inputCol: "",
        alternateKeys: [""],
      }
    }
  }

  // Helper functions to get/set inputCol from metadata
  const getInputColFromMetadata = () => {
    try {
      const parsed = JSON.parse(formData.metadata)
      return (parsed as any).input_col || ""
    } catch {
      return ""
    }
  }

  const setInputColInMetadata = (inputCol: string) => {
    try {
      const parsed = JSON.parse(formData.metadata)
      const updated = { ...(parsed as any), input_col: inputCol }
      setFormData(prev => ({ ...prev, metadata: JSON.stringify(updated) }))
    } catch {
      // If parsing fails, create new metadata with just input_col
      setFormData(prev => ({ ...prev, metadata: JSON.stringify({ input_col: inputCol }) }))
    }
  }

  // Helper functions for custom metadata key/value pairs
  const addCustomMetadata = () => {
    setFormData(prev => ({
      ...prev,
      customMetadata: [...prev.customMetadata, { key: "", value: "" }],
    }))
  }

  const removeCustomMetadata = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customMetadata: prev.customMetadata.filter((_, i) => i !== index),
    }))
  }

  const updateCustomMetadata = (index: number, field: "key" | "value", value: string) => {
    setFormData(prev => ({
      ...prev,
      customMetadata: prev.customMetadata.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const extractCustomMetadata = (metadataString: string) => {
    try {
      const parsed = JSON.parse(metadataString)
      const customPairs: { key: string; value: string }[] = []

      Object.entries(parsed).forEach(([key, value]) => {
        if (key !== "input_col" && key !== "alternate_keys") {
          // Stringify objects and arrays, keep primitives as strings
          const stringValue = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)
          customPairs.push({ key, value: stringValue })
        }
      })

      return customPairs
    } catch {
      return []
    }
  }

  const validateAndBuildMetadata = () => {
    setMetadataError("")

    // Parse existing metadata JSON to get inputCol and other fields
    let existingMetadata = {}
    try {
      existingMetadata = JSON.parse(formData.metadata)
    } catch (e) {
      // If parsing fails, start with empty object
    }

    // Get inputCol from the parsed metadata if it exists
    const inputCol = (existingMetadata as any).input_col || ""

    if (!inputCol.trim()) {
      setMetadataError("Input column is required")
      return null
    }

    const filteredAlternateKeys = formData.alternateKeys.filter((key: string) => key.trim() !== "")

    const metadata: any = {
      input_col: inputCol.trim(),
      ...(filteredAlternateKeys.length > 0 && { alternate_keys: filteredAlternateKeys }),
    }

    // Add custom metadata key/value pairs
    const validCustomMetadata = formData.customMetadata.filter(
      item => item.key.trim() !== "" && item.value.trim() !== "",
    )
    validCustomMetadata.forEach(item => {
      const key = item.key.trim()
      const value = item.value.trim()

      // Try to parse as JSON first (for objects/arrays), fall back to string
      try {
        // If it looks like JSON (starts with { or [), try to parse it
        if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
          metadata[key] = JSON.parse(value)
        } else {
          metadata[key] = value
        }
      } catch {
        // If parsing fails, treat as string
        metadata[key] = value
      }
    })

    return JSON.stringify(metadata)
  }

  const addAlternateKey = () => {
    setFormData(prev => ({
      ...prev,
      alternateKeys: [...prev.alternateKeys, ""],
    }))
  }

  const removeAlternateKey = (index: number) => {
    setFormData(prev => ({
      ...prev,
      alternateKeys: prev.alternateKeys.filter((_, i) => i !== index),
    }))
  }

  const updateAlternateKey = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      alternateKeys: prev.alternateKeys.map((key, i) => (i === index ? value : key)),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validatedMetadata = validateAndBuildMetadata()
    if (!validatedMetadata) {
      return
    }

    setLoading(true)
    const isEditing = !!editingMapping
    trackFormInteraction(isEditing ? "edit" : "add", "data_mapping", "submit")

    try {
      // For new mappings, use the selected dataSource from the form
      // For editing, use the current tab's dataSource
      const apiDataSource = editingMapping
        ? getApiDataSource(selectedDataSource)
        : getApiDataSource(formData.dataSource)

      if (editingMapping) {
        const response = await fetch(`/api/mappings/${tenant.clientId}/${apiDataSource}/update`, {
          method: "PUT",
          headers: {
            "x-api-key": tenant.apiKey,
            "x-api-endpoint": tenant.apiEndpoint,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userProperty: editingMapping.UserProperty,
            profileUpdateFunction: formData.profileUpdateFunction,
            isMandatory: formData.isMandatory,
            tenantId: tenant.clientId,
            dataSourceName: apiDataSource,
            metadata: validatedMetadata,
          }),
        })

        if (response.ok) {
          await fetchMappings(selectedDataSource)
          setIsEditDialogOpen(false)
          setEditingMapping(null)
          resetForm()
          trackDataManagement("update", "data_mapping", {
            userProperty: formData.userProperty,
            profileUpdateFunction: formData.profileUpdateFunction,
            dataSource: selectedDataSource,
          })
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/update`, "PUT", true)
        } else {
          console.error("Failed to update mapping:", response.statusText)
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/update`, "PUT", false)
          trackFormInteraction("edit", "data_mapping", "error")
          trackError("api_error", `Failed to update mapping: ${response.statusText}`, "data-mappings-manager")
        }
      } else {
        // Create new mapping
        const response = await fetch(`/api/mappings/${tenant.clientId}/${apiDataSource}`, {
          method: "POST",
          headers: {
            "x-api-key": tenant.apiKey,
            "x-api-endpoint": tenant.apiEndpoint,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userProperty: formData.userProperty,
            profileUpdateFunction: formData.profileUpdateFunction,
            isMandatory: formData.isMandatory,
            tenantId: tenant.clientId,
            dataSourceName: apiDataSource,
            metadata: validatedMetadata,
          }),
        })

        if (response.ok) {
          // Refresh the appropriate tab based on where the mapping was created
          await fetchMappings(editingMapping ? selectedDataSource : formData.dataSource)
          setIsAddDialogOpen(false)
          resetForm()
          trackDataManagement("create", "data_mapping", {
            userProperty: formData.userProperty,
            profileUpdateFunction: formData.profileUpdateFunction,
            dataSource: formData.dataSource,
          })
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "POST", true)
        } else {
          console.error("Failed to create mapping:", response.statusText)
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "POST", false)
          trackFormInteraction("add", "data_mapping", "error")
          trackError("api_error", `Failed to create mapping: ${response.statusText}`, "data-mappings-manager")
        }
      }
    } catch (error) {
      console.error("Error saving mapping:", error)
      trackFormInteraction(editingMapping ? "edit" : "add", "data_mapping", "error")
      trackError("network_error", `Error saving mapping: ${error}`, "data-mappings-manager")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (mapping: DataMapping) => {
    trackDetailedUserAction("edit", "data_mappings", {
      userProperty: mapping.UserProperty,
      dataSource: selectedDataSource,
    })
    setEditingMapping(mapping)

    const metadataString = mapping.Metadata || "{}"

    const parsedMetadata = parseMetadata(metadataString)
    const customMetadata = extractCustomMetadata(metadataString)

    setFormData({
      userProperty: mapping.UserProperty || "",
      profileUpdateFunction: mapping.ProfileUpdateFunction || "UPDATE",
      isMandatory: mapping.IsMandatory || false,
      metadata: metadataString,
      alternateKeys: parsedMetadata.alternateKeys.length > 0 ? parsedMetadata.alternateKeys : [""],
      customMetadata: customMetadata.length > 0 ? customMetadata : [{ key: "", value: "" }],
      dataSource: selectedDataSource,
    })

    setIsEditDialogOpen(true)
  }

  const handleDelete = async (userProperty: string) => {
    setLoading(true)
    const apiDataSource = getApiDataSource(selectedDataSource)
    try {
      const response = await fetch(`/api/mappings/${tenant.clientId}/${apiDataSource}/${userProperty}/delete`, {
        method: "DELETE",
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        await fetchMappings(selectedDataSource)
        trackDataManagement("delete", "data_mapping", {
          userProperty,
          dataSource: selectedDataSource,
        })
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/${userProperty}/delete`, "DELETE", true)
      } else {
        console.error("Failed to delete mapping:", response.statusText)
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/${userProperty}/delete`, "DELETE", false)
        trackError("api_error", `Failed to delete mapping: ${response.statusText}`, "data-mappings-manager")
      }
    } catch (error) {
      console.error("Error deleting mapping:", error)
      trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/${userProperty}/delete`, "DELETE", false)
      trackError("network_error", `Error deleting mapping: ${error}`, "data-mappings-manager")
    } finally {
      setLoading(false)
    }
  }

  const filteredMappings = mappings.filter(
    mapping =>
      (mapping.UserProperty?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (mapping.ProfileUpdateFunction?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (mapping.Metadata?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredMappings.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMappings = filteredMappings.slice(startIndex, endIndex)

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Mappings</h2>
          <p className="text-slate-600">Manage data source mappings for {tenant.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchMappings(selectedDataSource)}
            disabled={loading}
            className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={open => {
              setIsAddDialogOpen(open)
              if (open && userProperties.length === 0) {
                fetchUserProperties()
              }
            }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Data Mapping</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataSource">Data Source</Label>
                    <Select
                      value={formData.dataSource}
                      onValueChange={value => setFormData(prev => ({ ...prev, dataSource: value as DataSource }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analyze_post">Web SDK</SelectItem>
                        <SelectItem value="dataingestionpi">Data Ingestion API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userProperty">User Property</Label>
                    <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={propertySearchOpen}
                          className="w-full justify-between">
                          {formData.userProperty ||
                            (loadingProperties
                              ? "Loading properties..."
                              : userProperties.length === 0
                              ? "No properties available"
                              : "Select a user property")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search properties..." />
                          <CommandList>
                            <CommandEmpty>No properties found.</CommandEmpty>
                            <CommandGroup>
                              {userProperties.map(property => (
                                <CommandItem
                                  key={property}
                                  value={property}
                                  onSelect={currentValue => {
                                    setFormData(prev => ({
                                      ...prev,
                                      userProperty: currentValue === formData.userProperty ? "" : currentValue,
                                    }))
                                    setPropertySearchOpen(false)
                                  }}>
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      formData.userProperty === property ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {property}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {userProperties.length === 0 && !loadingProperties && (
                      <p className="text-sm text-slate-500">No user properties found. Create user properties first.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileUpdateFunction">Profile Update Function</Label>
                    <Select
                      value={formData.profileUpdateFunction}
                      onValueChange={value => setFormData(prev => ({ ...prev, profileUpdateFunction: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {updateFunctions.map(func => (
                          <SelectItem key={func} value={func}>
                            {func}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-600">Note: This setting cannot be changed via API at this time</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isMandatory"
                        checked={formData.isMandatory}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, isMandatory: checked }))}
                      />
                      <Label htmlFor="isMandatory">Mandatory</Label>
                    </div>
                    <p className="text-xs text-amber-600">Note: This setting cannot be changed via API at this time</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Metadata Configuration</Label>
                    <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                      <div className="space-y-2">
                        <Label htmlFor="inputCol" className="text-sm font-medium">
                          Input Column *
                        </Label>
                        <Input
                          id="inputCol"
                          value={getInputColFromMetadata()}
                          onChange={e => setInputColInMetadata(e.target.value)}
                          placeholder="e.g., properties__customer_id"
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Alternate Keys</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAlternateKey}
                            className="h-7 px-2 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {formData.alternateKeys.map((key, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={key}
                                onChange={e => updateAlternateKey(index, e.target.value)}
                                placeholder="Alternate key"
                                className="bg-white"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAlternateKey(index)}
                                className="h-8 w-8 p-0 flex-shrink-0">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Additional Metadata (Optional)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCustomMetadata}
                            className="h-7 px-2 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Field
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          For object values, use JSON format: {"{"}"key":"value"{"}"}
                        </p>
                        <div className="space-y-2">
                          {formData.customMetadata.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={item.key}
                                onChange={e => updateCustomMetadata(index, "key", e.target.value)}
                                placeholder="Key (e.g., preprocessor_function)"
                                className="bg-white"
                              />
                              <Input
                                value={item.value}
                                onChange={e => updateCustomMetadata(index, "value", e.target.value)}
                                placeholder='Value (e.g., "true" or {"is_milli":"true"})'
                                className="bg-white"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeCustomMetadata(index)}
                                className="h-8 w-8 p-0 flex-shrink-0">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      resetForm()
                    }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Create"} Mapping
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs
        value={selectedDataSource}
        onValueChange={value => {
          const newDataSource = value as DataSource
          setSelectedDataSource(newDataSource)
          trackDetailedUserAction("view", "data_mappings", { dataSource: newDataSource })
        }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="analyze_post" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Web SDK
          </TabsTrigger>
          <TabsTrigger value="dataingestionpi" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Ingestion API
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedDataSource} className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {selectedDataSource === "analyze_post" ? "Web SDK" : "Data Ingestion API"} Mappings (
                  {filteredMappings.length} total)
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search mappings..."
                      value={searchTerm}
                      onChange={e => {
                        setSearchTerm(e.target.value)
                        if (e.target.value) {
                          trackSearchFilter("search", "data_mappings", e.target.value)
                        }
                      }}
                      className="w-64"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="page-size" className="text-sm font-medium">
                      Per page:
                    </Label>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger id="page-size" className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">User Property</TableHead>
                      <TableHead className="w-20">Data Type</TableHead>
                      <TableHead className="w-24">Update Function</TableHead>
                      <TableHead>Mandatory</TableHead>
                      <TableHead>Pref</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-32">Metadata</TableHead>
                      <TableHead className="min-w-20 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMappings.map(mapping => (
                      <TableRow key={mapping.UserProperty}>
                        <TableCell className="font-medium">{mapping.UserProperty}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{mapping.DataType}</Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const updateFunc = mapping.ProfileUpdateFunction || "UPDATE"
                            const shouldTruncate = updateFunc.length > 10
                            const truncated = shouldTruncate ? `${updateFunc.substring(0, 8)}...` : updateFunc

                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={`cursor-help ${shouldTruncate ? "pr-2" : ""}`}
                                      style={{ maxWidth: shouldTruncate ? "96px" : "none" }}>
                                      {truncated}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold text-xs mb-1">Update Function:</p>
                                    <p className="text-sm">{updateFunc}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mapping.IsMandatory ? "destructive" : "secondary"}>
                            {mapping.IsMandatory ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{mapping.Preference}</Badge>
                        </TableCell>
                        <TableCell>{mapping.Priority}</TableCell>
                        <TableCell>
                          {(() => {
                            try {
                              const metadata = JSON.parse(mapping.Metadata || "{}")
                              const inputCol = metadata.input_col || "N/A"
                              const alternateKeys = metadata.alternate_keys || []

                              if (inputCol === "N/A" || inputCol === "Invalid") {
                                return <span className="text-sm text-slate-500">{inputCol}</span>
                              }

                              // Truncate long input column names for display
                              const truncated = inputCol.length > 20 ? `${inputCol.substring(0, 20)}...` : inputCol

                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs font-mono cursor-help block truncate max-w-32">
                                        {truncated}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-2">
                                        <div>
                                          <p className="font-semibold text-xs mb-1">Input Column:</p>
                                          <p className="font-mono text-sm">{inputCol}</p>
                                        </div>
                                        {alternateKeys.length > 0 && (
                                          <div>
                                            <p className="font-semibold text-xs mb-1">Alternate Keys:</p>
                                            <div className="space-y-1">
                                              {alternateKeys.map((key: string, index: number) => (
                                                <p key={index} className="font-mono text-sm">
                                                  {key}
                                                </p>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            } catch {
                              return <span className="text-sm text-slate-500">Invalid</span>
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(mapping)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete mapping "{mapping.UserProperty}"? This action cannot
                                    be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(mapping.UserProperty)}
                                    className="bg-red-600 hover:bg-red-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredMappings.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    {searchTerm
                      ? "No mappings match your search."
                      : loading
                      ? "Loading mappings..."
                      : "No mappings found."}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredMappings.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-slate-600 whitespace-nowrap">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredMappings.length)} of {filteredMappings.length}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={e => {
                            e.preventDefault()
                            if (currentPage > 1) handlePageChange(currentPage - 1)
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        // Show first page, last page, current page, and pages around current page
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={e => {
                                  e.preventDefault()
                                  handlePageChange(page)
                                }}
                                isActive={currentPage === page}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        }
                        return null
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={e => {
                            e.preventDefault()
                            if (currentPage < totalPages) handlePageChange(currentPage + 1)
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Mapping</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-userProperty">User Property</Label>
                <Input
                  id="edit-userProperty"
                  value={formData.userProperty}
                  onChange={e => setFormData(prev => ({ ...prev, userProperty: e.target.value }))}
                  placeholder="Enter user property name"
                  required
                  disabled={!!editingMapping}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profileUpdateFunction">Profile Update Function</Label>
                <Select
                  value={formData.profileUpdateFunction}
                  onValueChange={value => setFormData(prev => ({ ...prev, profileUpdateFunction: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {updateFunctions.map(func => (
                      <SelectItem key={func} value={func}>
                        {func}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600">Note: This setting cannot be changed via API at this time</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isMandatory"
                    checked={formData.isMandatory}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, isMandatory: checked }))}
                  />
                  <Label htmlFor="edit-isMandatory">Mandatory</Label>
                </div>
                <p className="text-xs text-amber-600">Note: This setting cannot be changed via API at this time</p>
              </div>
              <div className="space-y-2">
                <Label>Metadata Configuration</Label>
                <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                  <div className="space-y-2">
                    <Label htmlFor="edit-inputCol" className="text-sm font-medium">
                      Input Column *
                    </Label>
                    <Input
                      id="edit-inputCol"
                      value={getInputColFromMetadata()}
                      onChange={e => setInputColInMetadata(e.target.value)}
                      placeholder="e.g., properties__customer_id"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Alternate Keys</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAlternateKey}
                        className="h-7 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Key
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.alternateKeys.map((key, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={key}
                            onChange={e => updateAlternateKey(index, e.target.value)}
                            placeholder="e.g., properties__userId"
                            className="bg-white"
                          />
                          {formData.alternateKeys.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAlternateKey(index)}
                              className="h-8 w-8 p-0 flex-shrink-0">
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Additional Metadata (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomMetadata}
                        className="h-7 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Field
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      For object values, use JSON format: {"{"}"key":"value"{"}"}
                    </p>
                    <div className="space-y-2">
                      {formData.customMetadata.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={item.key}
                            onChange={e => updateCustomMetadata(index, "key", e.target.value)}
                            placeholder="Key (e.g., preprocessor_function)"
                            className="bg-white"
                          />
                          <Input
                            value={item.value}
                            onChange={e => updateCustomMetadata(index, "value", e.target.value)}
                            placeholder='Value (e.g., "true" or {"is_milli":"true"})'
                            className="bg-white"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomMetadata(index)}
                            className="h-8 w-8 p-0 flex-shrink-0">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {metadataError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {metadataError}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingMapping(null)
                  resetForm()
                }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update"} Mapping
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
