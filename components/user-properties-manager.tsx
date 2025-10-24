"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit2, Trash2, RefreshCw, Search, AlertCircle, CheckCircle, UserCog } from "lucide-react"
import { Tenant, UserProperty } from "@/types/tenant"
import { validateAuthState } from "@/lib/auth"
import {
  trackDataManagement,
  trackError,
  trackAPICall,
  trackFormInteraction,
  trackDetailedUserAction,
  trackSearchFilter,
} from "@/lib/analytics"

interface UserPropertiesManagerProps {
  tenant: Tenant
  onAuthExpired?: () => void
}

export const UserPropertiesManager = ({ tenant, onAuthExpired }: UserPropertiesManagerProps) => {
  const [properties, setProperties] = useState<UserProperty[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<UserProperty | null>(null)
  const [authError, setAuthError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [formData, setFormData] = useState({
    propertyNames: "",
    dataType: "STRING",
    preference: "none",
    priority: 1,
  })

  // const dataTypes = ["STRING", "NUMBER", "BOOLEAN", "JSONOBJ", "JSONARR"]
  const dataTypes = ["STRING", "JSONARR"]
  const preferences = ["pri", "sec", "none"]

  const getPreferenceBadgeVariant = (preference: string) => {
    switch (preference) {
      case "pri":
        return "default" // Blue
      case "sec":
        return "secondary" // Gray
      case "none":
        return "outline" // Light gray outline
      default:
        return "outline"
    }
  }

  const getPreferenceColor = (preference: string) => {
    switch (preference) {
      case "pri":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "sec":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "none":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const checkAuthAndExecute = async (callback: () => Promise<void>) => {
    const authValidation = validateAuthState()
    if (!authValidation.isValid && onAuthExpired) {
      setAuthError(true)
      onAuthExpired()
      return
    }
    setAuthError(false)
    await callback()
  }

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null) // Clear any previous errors
    try {
      console.log("Fetching properties for tenant:", tenant.clientId)
      console.log("API endpoint:", tenant.apiEndpoint)
      const response = await fetch(`/api/user-properties/${tenant.clientId}`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      console.log("Response URL:", response.url)

      if (response.ok) {
        const data = await response.json()
        console.log("Properties data:", data)
        setProperties(data)
        trackAPICall("/api/user-properties", "GET", true)
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch properties:", response.statusText, errorText)
        trackAPICall("/api/user-properties", "GET", false)
        trackError("api_error", `Failed to fetch properties: ${response.statusText}`, "user-properties-manager")
      }
    } catch (error) {
      console.error("Error fetching properties:", error)
      trackAPICall("/api/user-properties", "GET", false)
      trackError("network_error", `Error fetching properties: ${error}`, "user-properties-manager")
    } finally {
      setLoading(false)
    }
  }, [tenant.clientId, tenant.apiKey, tenant.apiEndpoint])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const resetForm = () => {
    setFormData({
      propertyNames: "",
      dataType: "STRING",
      preference: "none",
      priority: 1,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null) // Clear any previous errors

    const formType = editingProperty ? "edit" : "add"
    trackFormInteraction(formType, "user_property", "submit")

    try {
      if (editingProperty) {
        // Handle editing single property (existing functionality)
        const payload = {
          tenantId: tenant.clientId,
          userProperty: formData.propertyNames, // Will be single property name for edit
          dataType: formData.dataType,
          preference: formData.preference,
          priority: formData.priority,
        }

        const url = `/api/user-properties/${tenant.clientId}/${editingProperty.userProperty}`
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "x-api-key": tenant.apiKey,
            "x-api-endpoint": tenant.apiEndpoint,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          await fetchProperties()
          setIsEditDialogOpen(false)
          setEditingProperty(null)
          resetForm()

          trackDataManagement("update", "user_property", {
            propertyName: formData.propertyNames,
            dataType: formData.dataType,
            preference: formData.preference,
          })
          trackAPICall(url, "PUT", true)
        } else {
          console.error("Failed to update property:", response.statusText)
          trackAPICall(url, "PUT", false)
          trackFormInteraction("edit", "user_property", "error")
          trackError("api_error", `Failed to update property: ${response.statusText}`, "user-properties-manager")
        }
      } else {
        // Handle creating multiple properties
        const propertyNames = formData.propertyNames
          .split("\n")
          .map(name => name.trim())
          .filter(name => name.length > 0)

        if (propertyNames.length === 0) {
          setErrorMessage("Please enter at least one property name")
          return
        }

        console.log(`Creating ${propertyNames.length} properties:`, propertyNames)

        let successCount = 0
        let skippedCount = 0
        let failureCount = 0
        const skippedProperties: string[] = []
        const failedProperties: string[] = []

        // Create each property
        for (const propertyName of propertyNames) {
          try {
            const payload = {
              tenantId: tenant.clientId,
              userProperty: propertyName,
              dataType: formData.dataType,
              preference: formData.preference,
              priority: formData.priority,
            }

            const response = await fetch(`/api/user-properties/${tenant.clientId}`, {
              method: "POST",
              headers: {
                "x-api-key": tenant.apiKey,
                "x-api-endpoint": tenant.apiEndpoint,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            })

            if (response.ok) {
              successCount++
              console.log(`Successfully created property: ${propertyName}`)
              trackDataManagement("create", "user_property", {
                propertyName,
                dataType: formData.dataType,
                preference: formData.preference,
              })
              trackAPICall(`/api/user-properties/${tenant.clientId}`, "POST", true)
            } else {
              // Check if it's a "property already exists" error
              let errorData
              try {
                errorData = await response.json()
              } catch {
                errorData = { error: response.statusText }
              }

              const errorMessage = errorData.message || errorData.error || response.statusText
              const isAlreadyExists =
                errorMessage.toLowerCase().includes("already exists") ||
                errorMessage.toLowerCase().includes("duplicate") ||
                errorMessage.includes("already exists for Tenant") ||
                response.status === 409 // Conflict status code

              if (isAlreadyExists) {
                skippedCount++
                skippedProperties.push(propertyName)
                console.log(`Property already exists, skipping: ${propertyName}`)
                // Track as success since the property exists (which is the desired end state)
                trackAPICall(`/api/user-properties/${tenant.clientId}`, "POST", true)
              } else {
                failureCount++
                failedProperties.push(propertyName)
                console.error(`Failed to create property ${propertyName}:`, errorMessage)
                trackAPICall(`/api/user-properties/${tenant.clientId}`, "POST", false)
              }
            }
          } catch (error) {
            failureCount++
            failedProperties.push(propertyName)
            console.error(`Error creating property ${propertyName}:`, error)
          }
        }

        // Show results summary - only show actual failures, not skipped duplicates
        if (successCount > 0 || skippedCount > 0) {
          let successMsg = ""
          if (successCount > 0 && skippedCount > 0) {
            successMsg = `Created ${successCount} new properties and skipped ${skippedCount} existing properties`
          } else if (successCount > 0) {
            successMsg = `Successfully created ${successCount} ${successCount === 1 ? "property" : "properties"}`
          } else if (skippedCount > 0) {
            successMsg = `All ${skippedCount} ${skippedCount === 1 ? "property" : "properties"} already exist`
          }

          console.log(successMsg)
          setSuccessMessage(successMsg)
          setErrorMessage(null) // Clear any previous errors
        }

        if (skippedCount > 0) {
          console.log(`Skipped ${skippedCount} properties that already exist: ${skippedProperties.join(", ")}`)
        }

        if (failureCount > 0) {
          const errorMsg = `Failed to create ${failureCount} properties: ${failedProperties.join(", ")}`
          setErrorMessage(errorMsg)
          setSuccessMessage(null) // Clear any success message if there are failures
          trackFormInteraction("add", "user_property", "error")
        }

        // Refresh the properties list and close dialog if any succeeded or were skipped
        const totalProcessed = successCount + skippedCount
        if (totalProcessed > 0) {
          await fetchProperties()
          setIsAddDialogOpen(false)
          resetForm()
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      trackFormInteraction(editingProperty ? "edit" : "add", "user_property", "error")
      trackError("network_error", `Error saving property: ${error}`, "user-properties-manager")
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (property: UserProperty) => {
    setErrorMessage(null) // Clear any previous errors
    trackDetailedUserAction("edit", "user_properties", {
      propertyName: property.dmpDataPointCode,
      dataType: property.dataType,
    })
    setEditingProperty(property)
    setFormData({
      propertyNames: property.dmpDataPointCode,
      dataType: property.dataType,
      preference: property.preference,
      priority: property.priority,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (propertyName: string) => {
    console.log("=== DELETE DEBUG ===")
    console.log("propertyName received:", propertyName)
    console.log("typeof propertyName:", typeof propertyName)

    setLoading(true)
    setErrorMessage(null) // Clear any previous errors

    try {
      const response = await fetch(`/api/user-properties/${tenant.clientId}/${propertyName}`, {
        method: "DELETE",
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        await fetchProperties()
        trackDataManagement("delete", "user_property", { propertyName })
        trackAPICall(`/api/user-properties/${tenant.clientId}/${propertyName}`, "DELETE", true)
      } else {
        // Handle error responses
        let errorMessage = "Failed to delete user property"
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
        }
        setErrorMessage(errorMessage)
        console.error("Failed to delete property:", errorMessage)
        trackAPICall(`/api/user-properties/${tenant.clientId}/${propertyName}`, "DELETE", false)
        trackError("api_error", `Failed to delete property: ${errorMessage}`, "user-properties-manager")
      }
    } catch (error) {
      const errorMsg = "Error deleting property: Network or server error"
      setErrorMessage(errorMsg)
      console.error("Error deleting property:", error)
      trackAPICall(`/api/user-properties/${tenant.clientId}/${propertyName}`, "DELETE", false)
      trackError("network_error", `Error deleting property: ${error}`, "user-properties-manager")
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter(
    property =>
      property.dmpDataPointCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.dataType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.preference?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredProperties.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex)

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handlePageChange = (page: number) => {
    trackSearchFilter("paginate", "user_properties", `page_${page}`)
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    trackSearchFilter("paginate", "user_properties", `page_size_${newPageSize}`)
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Properties</h2>
          <p className="text-slate-600">Manage user properties for {tenant.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              trackDetailedUserAction("refresh", "user_properties")
              fetchProperties()
            }}
            disabled={loading}
            className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={open => {
              if (open) {
                setErrorMessage(null) // Clear errors when opening dialog
                setSuccessMessage(null) // Clear success messages when opening dialog
                trackFormInteraction("add", "user_property", "open")
              }
              setIsAddDialogOpen(open)
            }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Properties
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New User Properties</DialogTitle>
              </DialogHeader>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyNames">Property Names</Label>
                    <Textarea
                      id="propertyNames"
                      value={formData.propertyNames}
                      onChange={e => setFormData(prev => ({ ...prev, propertyNames: e.target.value }))}
                      placeholder="Enter property names, one per line&#10;Example:&#10;customer_id&#10;email_address&#10;phone_number"
                      rows={5}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter one property name per line. All properties will be created with the same data type,
                      preference, and priority settings below.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataType">Data Type</Label>
                      <Select
                        value={formData.dataType}
                        onValueChange={value => setFormData(prev => ({ ...prev, dataType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preference">Preference</Label>
                      <Select
                        value={formData.preference}
                        onValueChange={value => setFormData(prev => ({ ...prev, preference: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {preferences.map(pref => (
                            <SelectItem key={pref} value={pref}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    pref === "pri" ? "bg-blue-500" : pref === "sec" ? "bg-orange-500" : "bg-gray-400"
                                  }`}></div>
                                {pref === "pri" ? "primary" : pref === "sec" ? "secondary" : "none"}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={e => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      trackFormInteraction("add", "user_property", "cancel")
                      setIsAddDialogOpen(false)
                      resetForm()
                    }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? "Saving..."
                      : (() => {
                          const propertyCount = formData.propertyNames.split("\n").filter(name => name.trim()).length
                          return propertyCount > 1 ? `Create ${propertyCount} Properties` : "Create Property"
                        })()}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {successMessage && (
        <Alert className="relative border-green-200 bg-green-50">
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
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="pr-8">{errorMessage}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMessage(null)}
            className="absolute right-2 top-2 h-6 w-6 p-0 text-red-600 hover:text-red-800">
            ×
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Properties ({filteredProperties.length} total)
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value)
                    if (e.target.value) {
                      trackSearchFilter("search", "user_properties", e.target.value)
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
                  <TableHead>Property Name</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Preference</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties.map(property => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.dmpDataPointCode || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{property.dataType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPreferenceColor(property.preference)}>
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              property.preference === "pri"
                                ? "bg-blue-600"
                                : property.preference === "sec"
                                ? "bg-orange-600"
                                : "bg-gray-600"
                            }`}></div>
                          {property.preference === "pri"
                            ? "primary"
                            : property.preference === "sec"
                            ? "secondary"
                            : "none"}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{property.priority}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(property)}>
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
                              <AlertDialogTitle>Delete Property</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "
                                {property.dmpDataPointCode || property.userProperty || "this property"}"? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  console.log("Property object:", property)
                                  const propertyName =
                                    property.userProperty || property.dmpDataPointCode || property.tenantId
                                  console.log("Using property name:", propertyName)
                                  trackDetailedUserAction("delete", "user_properties", {
                                    propertyName,
                                    dataType: property.dataType,
                                  })
                                  handleDelete(propertyName)
                                }}
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
            {filteredProperties.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? "No properties match your search." : "No properties found."}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredProperties.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-slate-600 whitespace-nowrap">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length}
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

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={open => {
          if (open) {
            setErrorMessage(null) // Clear errors when opening dialog
            setSuccessMessage(null) // Clear success messages when opening dialog
            trackFormInteraction("edit", "user_property", "open")
          }
          setIsEditDialogOpen(open)
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User Property</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dmpDataPointCode">Property Name</Label>
                <Input
                  id="edit-dmpDataPointCode"
                  value={formData.propertyNames}
                  onChange={e => setFormData(prev => ({ ...prev, propertyNames: e.target.value }))}
                  placeholder="Enter property name"
                  required
                  disabled={!!editingProperty}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dataType">Data Type</Label>
                  <Select
                    value={formData.dataType}
                    onValueChange={value => setFormData(prev => ({ ...prev, dataType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-preference">Preference</Label>
                  <Select
                    value={formData.preference}
                    onValueChange={value => setFormData(prev => ({ ...prev, preference: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {preferences.map(pref => (
                        <SelectItem key={pref} value={pref}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                pref === "pri" ? "bg-blue-500" : pref === "sec" ? "bg-orange-500" : "bg-gray-400"
                              }`}></div>
                            {pref === "pri" ? "primary" : pref === "sec" ? "secondary" : "none"}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingProperty(null)
                  resetForm()
                }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update"} Property
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
