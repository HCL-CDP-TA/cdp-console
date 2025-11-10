"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  RefreshCw,
  Search,
  Database,
  Check,
  ChevronsUpDown,
  FileUp,
  Braces,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react"
import { Tenant, DataMapping, DataSource, OfflineDataSource } from "@/types/tenant"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { validateAuthState } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"
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

export const DataMappingsManager = ({ tenant, onAuthExpired }: DataMappingsManagerProps) => {
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

  // Core API state for offline data sources
  const [offlineDataSources, setOfflineDataSources] = useState<OfflineDataSource[]>([])
  const [coreApiToken, setCoreApiToken] = useState<string | null>(null)
  const [selectedOfflineDataSource, setSelectedOfflineDataSource] = useState<string | null>(null)
  const [offlineDataSourcesLoading, setOfflineDataSourcesLoading] = useState(false)
  const [showCoreApiCredentials, setShowCoreApiCredentials] = useState(false)
  const [coreApiCredentials, setCoreApiCredentials] = useState({
    username: "",
    password: "",
  })
  const [formData, setFormData] = useState({
    userProperty: "",
    userProperties: "", // For bulk creation
    profileUpdateFunction: "UPDATE",
    isMandatory: false,
    metadata: JSON.stringify({ input_col: "properties__" }),
    alternateKeys: [""],
    customMetadata: [{ key: "", value: "" }],
    dataSource: "analyze_post" as DataSource | string,
  })
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  // Core API authentication functions
  const authenticateCoreApi = async (username: string, password: string): Promise<string | null> => {
    try {
      const hashedPassword = await hashPassword(password)
      console.log("Core API Authentication - Frontend:", {
        username,
        originalPasswordLength: password.length,
        hashedPasswordLength: hashedPassword.length,
        hashedPasswordPrefix: hashedPassword.substring(0, 8) + "...",
        timestamp: new Date().toISOString(),
      })

      return await authenticateCoreApiWithHash(username, hashedPassword)
    } catch (error) {
      console.error("Core API authentication error:", error)
      return null
    }
  }

  const authenticateCoreApiWithHash = async (username: string, hashedPassword: string): Promise<string | null> => {
    try {
      console.log("Core API Authentication With Hash - Frontend:", {
        username,
        hashedPasswordLength: hashedPassword.length,
        hashedPasswordPrefix: hashedPassword.substring(0, 8) + "...",
        timestamp: new Date().toISOString(),
      })

      const response = await fetch("/api/core-auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: hashedPassword }),
      })

      console.log("Core API Authentication - Response received:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Core API Authentication - Success:", {
          hasAccessToken: !!data.access_token,
          tokenLength: data.access_token?.length,
          tokenType: data.token_type,
        })
        return data.access_token
      } else {
        const errorData = await response.json()
        console.error("Core API Authentication - Failed:", {
          status: response.status,
          errorData,
          sentCredentials: {
            username,
            hashedPasswordLength: hashedPassword.length,
            hashedPasswordPrefix: hashedPassword.substring(0, 8) + "...",
          },
        })
      }
      return null
    } catch (error) {
      console.error("Core API authentication with hash error:", error)
      return null
    }
  }

  const fetchOfflineDataSources = useCallback(
    async (token: string): Promise<OfflineDataSource[]> => {
      try {
        console.log("Fetch Offline Data Sources - Starting request:", {
          clientId: tenant.clientId,
          hasToken: !!token,
          tokenLength: token?.length,
          timestamp: new Date().toISOString(),
        })

        const response = await fetch(`/api/offline-data-sources/${tenant.clientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        console.log("Fetch Offline Data Sources - Response received:", {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Fetch Offline Data Sources - Success:", {
            fullResponseData: data,
            hasDataArray: !!data.data,
            dataArrayLength: data.data?.length || 0,
            dataItems:
              data.data?.map((item: any) => ({
                id: item.id,
                name: item.name,
                isActive: item.isActive,
                type: item.type,
              })) || [],
          })
          return data.data || []
        } else if (response.status === 401) {
          const errorData = await response.json()
          console.log("Fetch Offline Data Sources - 401 error:", errorData)
          if (errorData.shouldReauth) {
            throw new Error("REAUTH_REQUIRED")
          }
        } else {
          const errorText = await response.text()
          console.error("Fetch Offline Data Sources - Error:", {
            status: response.status,
            statusText: response.statusText,
            errorText,
          })
        }
        return []
      } catch (error) {
        if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
          throw error
        }
        console.error("Error fetching offline data sources:", error)
        return []
      }
    },
    [tenant.clientId],
  )

  const loadOfflineDataSources = useCallback(async () => {
    setOfflineDataSourcesLoading(true)
    try {
      // Check if we have stored credentials
      const storedTenant = JSON.parse(localStorage.getItem(`tenant-${tenant.id}`) || "{}")
      if (storedTenant.coreApiUsername && storedTenant.coreApiPassword) {
        console.log("Load Offline Data Sources - Using stored credentials:", {
          username: storedTenant.coreApiUsername,
          hasStoredPassword: !!storedTenant.coreApiPassword,
          storedPasswordLength: storedTenant.coreApiPassword?.length,
        })

        // Try to authenticate with stored credentials (already hashed)
        const token = await authenticateCoreApiWithHash(storedTenant.coreApiUsername, storedTenant.coreApiPassword)
        if (token) {
          setCoreApiToken(token)
          try {
            const dataSources = await fetchOfflineDataSources(token)
            setOfflineDataSources(dataSources.filter(ds => ds.isActive === 1))
          } catch (error) {
            if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
              // Token expired, need to re-authenticate
              const newToken = await authenticateCoreApiWithHash(
                storedTenant.coreApiUsername,
                storedTenant.coreApiPassword,
              )
              if (newToken) {
                setCoreApiToken(newToken)
                const dataSources = await fetchOfflineDataSources(newToken)
                setOfflineDataSources(dataSources.filter(ds => ds.isActive === 1))
              } else {
                console.error("Failed to re-authenticate with Core API")
                setOfflineDataSources([])
              }
            }
          }
        } else {
          // Stored credentials are invalid, prompt for new ones
          console.warn("Stored credentials are invalid, prompting for new ones")
          setShowCoreApiCredentials(true)
        }
      } else {
        // No stored credentials, prompt for them
        console.log("No stored Core API credentials found")
        setShowCoreApiCredentials(true)
      }
    } catch (error) {
      console.error("Error loading offline data sources:", error)
      setOfflineDataSources([])
    } finally {
      setOfflineDataSourcesLoading(false)
    }
  }, [tenant.id, fetchOfflineDataSources])

  const handleCoreApiCredentialsSubmit = async () => {
    console.log("Core API Credentials Submit - Starting:", {
      username: coreApiCredentials.username,
      passwordLength: coreApiCredentials.password.length,
      timestamp: new Date().toISOString(),
    })

    // Don't hash here - let authenticateCoreApi handle the hashing
    const token = await authenticateCoreApi(coreApiCredentials.username, coreApiCredentials.password)

    if (token) {
      console.log("Core API Credentials Submit - Authentication successful")
      setCoreApiToken(token)

      // Store credentials in localStorage (with hashed password)
      const hashedPassword = await hashPassword(coreApiCredentials.password)
      const storedTenant = JSON.parse(localStorage.getItem(`tenant-${tenant.id}`) || "{}")
      const updatedTenant = {
        ...storedTenant,
        coreApiUsername: coreApiCredentials.username,
        coreApiPassword: hashedPassword,
      }
      localStorage.setItem(`tenant-${tenant.id}`, JSON.stringify(updatedTenant))

      // Fetch offline data sources
      try {
        console.log("Handle Core API Credentials Submit - Fetching data sources...")
        const dataSources = await fetchOfflineDataSources(token)
        console.log("Handle Core API Credentials Submit - Data sources received:", {
          dataSourcesLength: dataSources.length,
          allDataSources: dataSources,
          activeDataSources: dataSources.filter(ds => ds.isActive === 1),
        })
        setOfflineDataSources(dataSources.filter(ds => ds.isActive === 1))
        setShowCoreApiCredentials(false)
        setCoreApiCredentials({ username: "", password: "" })
      } catch (error) {
        console.error("Failed to fetch offline data sources:", error)
      }
    } else {
      console.error("Core API Credentials Submit - Authentication failed")
      alert("Authentication failed. Please check your credentials.")
    }
  }

  const fetchMappings = useCallback(
    async (dataSource: DataSource) => {
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
    },
    [tenant.clientId, tenant.apiKey, tenant.apiEndpoint],
  )

  const fetchOfflineMappings = useCallback(
    async (offlineDataSourceName: string) => {
      setLoading(true)
      console.log("Fetching mappings for offline data source:", {
        offlineDataSourceName,
        tenantClientId: tenant.clientId,
        hasToken: !!coreApiToken,
      })

      try {
        const response = await fetch(`/api/mappings/${tenant.clientId}/${offlineDataSourceName}`, {
          headers: {
            "x-api-key": tenant.apiKey,
            "x-api-endpoint": tenant.apiEndpoint,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Successfully fetched offline mappings:", {
            dataSourceName: offlineDataSourceName,
            mappingsCount: data.length,
          })
          setMappings(data)
          trackAPICall(`/api/mappings/${tenant.clientId}/${offlineDataSourceName}`, "GET", true)
        } else {
          console.error("Failed to fetch offline mappings:", response.statusText)
          setMappings([])
          trackAPICall(`/api/mappings/${tenant.clientId}/${offlineDataSourceName}`, "GET", false)
          trackError("api_error", `Failed to fetch offline mappings: ${response.statusText}`, "data-mappings-manager")
        }
      } catch (error) {
        console.error("Error fetching offline mappings:", error)
        setMappings([])
        trackAPICall(`/api/mappings/${tenant.clientId}/${offlineDataSourceName}`, "GET", false)
        trackError("network_error", `Error fetching offline mappings: ${error}`, "data-mappings-manager")
      } finally {
        setLoading(false)
      }
    },
    [tenant.clientId, tenant.apiKey, tenant.apiEndpoint, coreApiToken],
  )

  const fetchCurrentMappings = useCallback(() => {
    if (selectedOfflineDataSource) {
      console.log("Fetching mappings for selected offline data source:", selectedOfflineDataSource)
      fetchOfflineMappings(selectedOfflineDataSource)
    } else {
      console.log("Fetching mappings for selected standard data source:", selectedDataSource)
      fetchMappings(selectedDataSource)
    }
  }, [selectedOfflineDataSource, selectedDataSource, fetchMappings, fetchOfflineMappings])

  const fetchUserProperties = useCallback(async () => {
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
  }, [tenant.clientId, tenant.apiKey, tenant.apiEndpoint])

  const createUserProperty = useCallback(
    async (propertyName: string): Promise<boolean> => {
      try {
        console.log("Creating new user property:", { propertyName, tenantId: tenant.clientId })

        const response = await fetch(`/api/user-properties/${tenant.clientId}`, {
          method: "POST",
          headers: {
            "x-api-key": tenant.apiKey,
            "x-api-endpoint": tenant.apiEndpoint,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenantId: tenant.clientId,
            userProperty: propertyName,
            dmpDataPointCode: "",
            dataType: "STRING",
            preference: "none",
            priority: 1,
          }),
        })

        if (response.ok) {
          console.log("Successfully created user property:", propertyName)
          // Refresh the user properties list to include the new property
          await fetchUserProperties()
          trackDataManagement("create", "user_property", {
            userProperty: propertyName,
            dataType: "STRING",
            preference: "none",
            priority: 1,
          })
          return true
        } else {
          console.error("Failed to create user property:", response.statusText)
          const errorData = await response.text()
          console.error("Error details:", errorData)
          return false
        }
      } catch (error) {
        console.error("Error creating user property:", error)
        return false
      }
    },
    [tenant.clientId, tenant.apiKey, tenant.apiEndpoint, fetchUserProperties],
  )

  useEffect(() => {
    fetchCurrentMappings()
  }, [fetchCurrentMappings])

  useEffect(() => {
    fetchUserProperties()
  }, [fetchUserProperties])

  useEffect(() => {
    console.log("Offline Data Sources State Changed:", {
      offlineDataSourcesLength: offlineDataSources.length,
      offlineDataSources: offlineDataSources.map(ds => ({
        id: ds.id,
        name: ds.name,
        isActive: ds.isActive,
      })),
      loading: offlineDataSourcesLoading,
      selectedOffline: selectedOfflineDataSource,
      timestamp: new Date().toISOString(),
    })
  }, [offlineDataSources, offlineDataSourcesLoading, selectedOfflineDataSource])

  useEffect(() => {
    console.log("Data Mappings Manager - Component mounted/updated:", {
      tenantId: tenant.id,
      clientId: tenant.clientId,
      tenantName: tenant.name,
      hasApiKey: !!tenant.apiKey,
      timestamp: new Date().toISOString(),
    })
    loadOfflineDataSources()
  }, [tenant.id, tenant.clientId, tenant.name, tenant.apiKey, loadOfflineDataSources])

  const resetForm = () => {
    const currentDataSource = selectedOfflineDataSource || selectedDataSource
    setFormData({
      userProperty: "",
      userProperties: "",
      profileUpdateFunction: "UPDATE",
      isMandatory: false,
      metadata: JSON.stringify({ input_col: "properties__" }),
      alternateKeys: [""],
      customMetadata: [{ key: "", value: "" }],
      dataSource: currentDataSource,
    })
    setMetadataError("")
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsBulkMode(false)
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

  const createSingleMapping = async (
    propertyName: string,
    apiDataSource: string,
    validatedMetadata: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if user property exists, create it if it doesn't
      const propertyExists = userProperties.includes(propertyName)

      if (!propertyExists && propertyName.trim()) {
        console.log("User property doesn't exist, creating it first:", propertyName)
        const propertyCreated = await createUserProperty(propertyName.trim())

        if (!propertyCreated) {
          console.error("Failed to create user property, aborting mapping creation")
          return { success: false, error: "Failed to create user property" }
        }
      }

      // Create new mapping
      const response = await fetch(`/api/mappings/${tenant.clientId}/${apiDataSource}`, {
        method: "POST",
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userProperty: propertyName,
          profileUpdateFunction: formData.profileUpdateFunction,
          isMandatory: formData.isMandatory,
          tenantId: tenant.clientId,
          dataSourceName: apiDataSource,
          metadata: validatedMetadata,
        }),
      })

      if (response.ok) {
        trackDataManagement("create", "data_mapping", {
          userProperty: propertyName,
          profileUpdateFunction: formData.profileUpdateFunction,
          dataSource: formData.dataSource,
        })
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "POST", true)
        return { success: true }
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        const errorMessage = errorData.message || errorData.error || response.statusText
        console.error("Failed to create mapping:", response.statusText)
        trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}`, "POST", false)
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error("Error creating mapping:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous messages
    setErrorMessage(null)
    setSuccessMessage(null)

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
      const currentDataSource = editingMapping ? selectedOfflineDataSource || selectedDataSource : formData.dataSource

      // Check if it's an offline data source
      const isOfflineDataSource =
        typeof currentDataSource === "string" && offlineDataSources.some(ds => ds.name === currentDataSource)

      const apiDataSource = isOfflineDataSource ? currentDataSource : getApiDataSource(currentDataSource as DataSource)

      console.log("Form submission:", {
        isEditing,
        isBulkMode,
        currentDataSource,
        isOfflineDataSource,
        apiDataSource,
        formDataSource: formData.dataSource,
      })

      if (isEditing) {
        // Handle single mapping edit
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
          await fetchCurrentMappings()
          setIsEditDialogOpen(false)
          setEditingMapping(null)
          resetForm()
          trackDataManagement("update", "data_mapping", {
            userProperty: formData.userProperty,
            profileUpdateFunction: formData.profileUpdateFunction,
            dataSource: currentDataSource,
          })
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/update`, "PUT", true)
        } else {
          console.error("Failed to update mapping:", response.statusText)
          trackAPICall(`/api/mappings/${tenant.clientId}/${apiDataSource}/update`, "PUT", false)
          trackFormInteraction("edit", "data_mapping", "error")
          trackError("api_error", `Failed to update mapping: ${response.statusText}`, "data-mappings-manager")
        }
      } else if (isBulkMode) {
        // Handle bulk mapping creation
        const propertyNames = formData.userProperties
          .split("\n")
          .map(name => name.trim())
          .filter(name => name !== "")

        if (propertyNames.length === 0) {
          setErrorMessage("Please enter at least one property name")
          return
        }

        let successCount = 0
        let skippedCount = 0
        let failureCount = 0
        const skippedProperties: string[] = []
        const failedProperties: string[] = []

        // Process each property
        for (const propertyName of propertyNames) {
          // Create metadata with the property-specific input column
          const propertyMetadata = { ...JSON.parse(validatedMetadata), input_col: `properties__${propertyName}` }
          const propertyMetadataString = JSON.stringify(propertyMetadata)

          const result = await createSingleMapping(propertyName, apiDataSource, propertyMetadataString)

          if (result.success) {
            successCount++
          } else {
            // Check if this is a "mapping already exists" error
            const isAlreadyExists =
              result.error &&
              (result.error.toLowerCase().includes("already exists") ||
                result.error.toLowerCase().includes("duplicate") ||
                result.error.includes("already exists for"))

            if (isAlreadyExists) {
              skippedCount++
              skippedProperties.push(propertyName)
            } else {
              failureCount++
              failedProperties.push(propertyName)
            }
          }
        }

        // Show results summary
        if (successCount > 0 || skippedCount > 0) {
          let successMsg = ""
          if (successCount > 0 && skippedCount > 0) {
            successMsg = `Created ${successCount} new mappings and skipped ${skippedCount} existing mappings`
          } else if (successCount > 0) {
            successMsg = `Successfully created ${successCount} ${successCount === 1 ? "mapping" : "mappings"}`
          } else if (skippedCount > 0) {
            successMsg = `All ${skippedCount} ${skippedCount === 1 ? "mapping" : "mappings"} already exist`
          }

          console.log(successMsg)
          setSuccessMessage(successMsg)
        }

        if (skippedCount > 0) {
          console.log(`Skipped ${skippedCount} mappings that already exist: ${skippedProperties.join(", ")}`)
        }

        if (failureCount > 0) {
          const errorMsg = `Failed to create ${failureCount} mappings: ${failedProperties.join(", ")}`
          setErrorMessage(errorMsg)
          trackFormInteraction("add", "data_mapping", "error")
        }

        // Refresh the mappings list and close dialog if any succeeded or were skipped
        const totalProcessed = successCount + skippedCount
        if (totalProcessed > 0) {
          await fetchCurrentMappings()
          setIsAddDialogOpen(false)
          resetForm()
        }
      } else {
        // Handle single mapping creation
        const result = await createSingleMapping(formData.userProperty, apiDataSource, validatedMetadata)

        if (result.success) {
          await fetchCurrentMappings()
          setIsAddDialogOpen(false)
          resetForm()
        } else {
          setErrorMessage(result.error || "Failed to create mapping")
          trackFormInteraction("add", "data_mapping", "error")
          trackError("api_error", `Failed to create mapping: ${result.error}`, "data-mappings-manager")
        }
      }
    } catch (error) {
      console.error("Error saving mapping:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred")
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
      userProperties: "",
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
    const currentDataSource = selectedOfflineDataSource || selectedDataSource
    const isOfflineDataSource = !!selectedOfflineDataSource
    const apiDataSource = isOfflineDataSource ? currentDataSource : getApiDataSource(selectedDataSource)

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
        await fetchCurrentMappings()
        trackDataManagement("delete", "data_mapping", {
          userProperty,
          dataSource: currentDataSource,
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

  // Helper function to search within metadata
  const searchInMetadata = (metadata: string, searchTerm: string): boolean => {
    if (!metadata || !searchTerm) return false

    try {
      const parsed = JSON.parse(metadata)
      const searchLower = searchTerm.toLowerCase()

      // Search through all keys and values in the metadata object
      const searchMetadataRecursively = (obj: any): boolean => {
        if (typeof obj === "string") {
          return obj.toLowerCase().includes(searchLower)
        }
        if (typeof obj === "number" || typeof obj === "boolean") {
          return String(obj).toLowerCase().includes(searchLower)
        }
        if (Array.isArray(obj)) {
          return obj.some(item => searchMetadataRecursively(item))
        }
        if (typeof obj === "object" && obj !== null) {
          return Object.entries(obj).some(
            ([key, value]) => key.toLowerCase().includes(searchLower) || searchMetadataRecursively(value),
          )
        }
        return false
      }

      return searchMetadataRecursively(parsed)
    } catch {
      // If JSON parsing fails, fall back to string search
      return metadata.toLowerCase().includes(searchTerm.toLowerCase())
    }
  }

  const currentDataSource = selectedOfflineDataSource || selectedDataSource
  // For filtering, we need to use the API data source name to match what's returned from the API
  const currentApiDataSource = selectedOfflineDataSource
    ? selectedOfflineDataSource
    : getApiDataSource(selectedDataSource)

  console.log("Data Mappings Filtering Debug:", {
    selectedDataSource,
    selectedOfflineDataSource,
    currentDataSource,
    currentApiDataSource,
    totalMappings: mappings.length,
    mappingDataSources: mappings.map(m => m.DataSourceName),
    uniqueDataSources: Array.from(new Set(mappings.map(m => m.DataSourceName))),
  })

  const filteredMappings = mappings.filter(
    mapping =>
      mapping.DataSourceName === currentApiDataSource &&
      ((mapping.UserProperty?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (mapping.ProfileUpdateFunction?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        searchInMetadata(mapping.Metadata || "", searchTerm)),
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
          <p className="text-slate-600">Manage data source mappings for {tenant.displayName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchCurrentMappings()}
            disabled={loading}
            className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={open => {
              setIsAddDialogOpen(open)
              if (open) {
                resetForm() // Set default data source to current tab
                if (userProperties.length === 0) {
                  fetchUserProperties()
                }
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
                    <Label htmlFor="dataSource">Data Source</Label>
                    <Select
                      value={formData.dataSource}
                      onValueChange={value => setFormData(prev => ({ ...prev, dataSource: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analyze_post">Web SDK</SelectItem>
                        <SelectItem value="dataingestionpi">Data Ingestion API</SelectItem>
                        {offlineDataSources
                          .filter(ds => ds.isActive === 1)
                          .map(dataSource => (
                            <SelectItem key={dataSource.name} value={dataSource.name}>
                              <div className="flex items-center gap-2">
                                <FileUp className="h-4 w-4" />
                                {dataSource.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="userProperty">User Properties</Label>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="bulk-mode" className="text-sm font-normal">
                          Bulk Mode
                        </Label>
                        <Switch
                          id="bulk-mode"
                          checked={isBulkMode}
                          onCheckedChange={checked => {
                            setIsBulkMode(checked)
                            if (checked) {
                              // Clear single property when switching to bulk
                              setFormData(prev => ({ ...prev, userProperty: "" }))
                              setPropertySearchOpen(false)
                            } else {
                              // Clear bulk properties when switching to single
                              setFormData(prev => ({ ...prev, userProperties: "" }))
                            }
                          }}
                        />
                      </div>
                    </div>

                    {isBulkMode ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter property names, one per line:&#10;customerAge&#10;customerStatus&#10;purchaseHistory"
                          value={formData.userProperties}
                          onChange={e => setFormData(prev => ({ ...prev, userProperties: e.target.value }))}
                          className="min-h-24"
                        />
                        <p className="text-xs text-slate-500">
                          Each property will automatically get an input column of "properties__&lt;property_name&gt;"
                        </p>
                        {formData.userProperties.split("\n").filter(name => name.trim()).length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <p className="text-sm text-blue-700">
                              <span className="font-medium">
                                {formData.userProperties.split("\n").filter(name => name.trim()).length} properties
                              </span>{" "}
                              will be created with:
                            </p>
                            <ul className="text-xs text-blue-600 mt-1 ml-4 list-disc">
                              <li>Update Function: {formData.profileUpdateFunction}</li>
                              <li>Mandatory: {formData.isMandatory ? "Yes" : "No"}</li>
                              <li>Auto-generated input columns</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
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
                            <CommandInput
                              placeholder="Search or type new property name..."
                              value={formData.userProperty}
                              onValueChange={value => {
                                setFormData(prev => ({
                                  ...prev,
                                  userProperty: value,
                                }))
                                // Auto-update input column if it's empty or follows the default pattern
                                const currentInputCol = getInputColFromMetadata()
                                if (
                                  !currentInputCol ||
                                  currentInputCol === "properties__" ||
                                  currentInputCol.startsWith("properties__")
                                ) {
                                  setInputColInMetadata(value ? `properties__${value}` : "properties__")
                                }
                              }}
                            />
                            <CommandList>
                              {userProperties.length === 0 && !loadingProperties ? (
                                <CommandEmpty>
                                  {formData.userProperty ? (
                                    <div className="p-2">
                                      <p className="text-sm text-muted-foreground">No existing properties found.</p>
                                      <p className="text-xs text-green-600 mt-1">
                                        Press Enter or click outside to create "{formData.userProperty}" as a new
                                        property
                                      </p>
                                    </div>
                                  ) : (
                                    "No properties available."
                                  )}
                                </CommandEmpty>
                              ) : (
                                <>
                                  <CommandEmpty>
                                    {formData.userProperty && !userProperties.includes(formData.userProperty) ? (
                                      <div className="p-2">
                                        <p className="text-sm text-muted-foreground">No matching properties found.</p>
                                        <p className="text-xs text-green-600 mt-1">
                                          Press Enter or click outside to create "{formData.userProperty}" as a new
                                          property
                                        </p>
                                      </div>
                                    ) : (
                                      "No properties found."
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {userProperties.map(property => (
                                      <CommandItem
                                        key={property}
                                        value={property}
                                        onSelect={currentValue => {
                                          setFormData(prev => ({
                                            ...prev,
                                            userProperty: currentValue,
                                          }))
                                          // Set default input column to properties__<property_name>
                                          setInputColInMetadata(`properties__${currentValue}`)
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
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    {!isBulkMode && formData.userProperty.trim() && !userProperties.includes(formData.userProperty) && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">New property:</span> "{formData.userProperty}" will be created
                          with:
                        </p>
                        <ul className="text-xs text-green-600 mt-1 ml-4 list-disc">
                          <li>Data Type: STRING</li>
                          <li>Preference: none</li>
                          <li>Priority: 1</li>
                        </ul>
                      </div>
                    )}
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
                  {!isBulkMode && (
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
                  )}
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
                    {loading
                      ? "Saving..."
                      : (() => {
                          if (isBulkMode) {
                            const propertyCount = formData.userProperties.split("\n").filter(name => name.trim()).length
                            return propertyCount > 1 ? `Create ${propertyCount} Mappings` : "Create Mapping"
                          } else {
                            return !userProperties.includes(formData.userProperty) && formData.userProperty.trim()
                              ? "Create Property & Mapping"
                              : "Create Mapping"
                          }
                        })()}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Standard Data Sources */}
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <button
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 ${
                selectedDataSource === "analyze_post" && !selectedOfflineDataSource
                  ? "bg-background text-foreground shadow-sm"
                  : ""
              }`}
              onClick={() => {
                setSelectedDataSource("analyze_post")
                setSelectedOfflineDataSource(null)
                trackDetailedUserAction("view", "data_mappings", { dataSource: "analyze_post" })
              }}>
              <Braces className="h-4 w-4" />
              Web SDK
            </button>
            <button
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 ${
                selectedDataSource === "dataingestionpi" && !selectedOfflineDataSource
                  ? "bg-background text-foreground shadow-sm"
                  : ""
              }`}
              onClick={() => {
                setSelectedDataSource("dataingestionpi")
                setSelectedOfflineDataSource(null)
                trackDetailedUserAction("view", "data_mappings", { dataSource: "dataingestionpi" })
              }}>
              <Database className="h-4 w-4" />
              Data Ingestion API
            </button>
          </div>

          {/* Offline Data Sources Loading */}
          {offlineDataSourcesLoading && (
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <div className="px-3 py-1.5 text-sm">Loading offline sources...</div>
            </div>
          )}

          {/* Offline Data Sources */}
          {offlineDataSources.length > 0 &&
            offlineDataSources
              .filter(ds => ds.isActive === 1)
              .map(dataSource => (
                <div
                  key={dataSource.name}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 ${
                      selectedOfflineDataSource === dataSource.name ? "bg-background text-foreground shadow-sm" : ""
                    }`}
                    onClick={() => {
                      console.log("Offline data source tab clicked:", {
                        dataSourceName: dataSource.name,
                        hasToken: !!coreApiToken,
                      })
                      if (!coreApiToken) {
                        setShowCoreApiCredentials(true)
                        return
                      }
                      setSelectedOfflineDataSource(dataSource.name)
                      setSelectedDataSource("analyze_post") // Reset standard selection
                      trackDetailedUserAction("view", "offline_data_mappings", { dataSource: dataSource.name })
                    }}>
                    <FileUp className="h-4 w-4" />
                    {dataSource.name}
                  </button>
                </div>
              ))}
        </div>

        {/* Dynamic Content Based on Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedOfflineDataSource ? (
                    <>
                      <FileUp className="h-5 w-5" />
                      {selectedOfflineDataSource} Mappings ({filteredMappings.length} total)
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5" />
                      {selectedDataSource === "analyze_post" ? "Web SDK" : "Data Ingestion API"} Mappings (
                      {filteredMappings.length} total)
                    </>
                  )}
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
        </div>
      </div>

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

      {/* Core API Credentials Dialog */}
      <Dialog open={showCoreApiCredentials} onOpenChange={setShowCoreApiCredentials}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>CDP Login Required</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Enter your CDP UI login credentials to access offline data sources
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="core-username">Username</Label>
              <Input
                id="core-username"
                value={coreApiCredentials.username}
                onChange={e => setCoreApiCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your CDP username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="core-password">Password</Label>
              <Input
                id="core-password"
                type="password"
                value={coreApiCredentials.password}
                onChange={e => setCoreApiCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your CDP password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCoreApiCredentials(false)
                  setCoreApiCredentials({ username: "", password: "" })
                }}>
                Cancel
              </Button>
              <Button
                onClick={handleCoreApiCredentialsSubmit}
                disabled={!coreApiCredentials.username || !coreApiCredentials.password}>
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
