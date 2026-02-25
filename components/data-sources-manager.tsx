"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Code,
  Smartphone,
  Tablet,
  FolderUp,
  Zap,
  Database,
  Code2,
  Network,
  Braces,
  Copy,
} from "lucide-react"
import { Tenant } from "@/types/tenant"
import { trackError, trackAPICall, trackUserAction } from "@/lib/analytics"

interface DataSourcesManagerProps {
  tenant: Tenant
  onAuthExpired?: () => void
}

interface SourceInstance {
  id: number
  cdpSourceId: number
  configJson: string
  status: "ACTIVE" | "INACTIVE"
  name: string
  campaignId: number
  writeKey: string
  createdOn: string
  createdBy: number
  updatedOn: string
  updatedBy: number
  sourceName: string
  sourceIconPath: string
  creatorEmailId: string
  sourceAvailableDestination: string
  destinationInstanceIds: string | null
  destinations: string | null
  type: string
}

interface ParsedConfig {
  name: string
  writeKey: string
  campaignId: number
  [key: string]: any
}

export const DataSourcesManager = ({ tenant, onAuthExpired }: DataSourcesManagerProps) => {
  const [dataSources, setDataSources] = useState<SourceInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [coreApiToken, setCoreApiToken] = useState<string | null>(null)
  const [coreApiNotConfigured, setCoreApiNotConfigured] = useState(false)

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

  const fetchDataSources = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      console.log("Fetching data sources for tenant:", tenant.clientId)

      // Get or reuse Core API token
      let token = coreApiToken
      if (!token) {
        token = await getCoreApiToken()
        if (!token) {
          return // Error already set or dialog shown by getCoreApiToken
        }
      }

      // Fetch data sources
      const response = await fetch(`/api/data-sources/${tenant.clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        setDataSources(result.data || [])
        trackAPICall(`/api/data-sources/${tenant.clientId}`, "GET", true)
      } else if (response.status === 401) {
        setErrorMessage("Authentication failed. Please try again.")
        trackAPICall(`/api/data-sources/${tenant.clientId}`, "GET", false)
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch data sources:", response.statusText, errorText)
        setErrorMessage(`Failed to load data sources: ${response.statusText}`)
        trackAPICall(`/api/data-sources/${tenant.clientId}`, "GET", false)
        trackError("api_error", `Failed to fetch data sources: ${response.statusText}`, "data-sources-manager")
      }
    } catch (error) {
      console.error("Error fetching data sources:", error)
      setErrorMessage("Network error while fetching data sources")
      trackAPICall(`/api/data-sources/${tenant.clientId}`, "GET", false)
      trackError("network_error", `Error fetching data sources: ${error}`, "data-sources-manager")
    } finally {
      setLoading(false)
    }
  }, [tenant.clientId, coreApiToken, getCoreApiToken])

  const handleSourceClick = (source: SourceInstance) => {
    trackUserAction("view_data_source_details", { sourceId: source.id, sourceName: source.name })
    // Navigate to data source view page
    window.location.href = `/data-source/${source.id}`
  }

  const getDataSourceIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || ""

    if (lowerType.includes("javascript") || lowerType.includes("js") || lowerType.includes("web")) {
      return <Braces className="h-8 w-8 text-blue-500" />
    } else if (lowerType.includes("ios") || lowerType.includes("iphone")) {
      return <Smartphone className="h-8 w-8 text-slate-700" />
    } else if (lowerType.includes("android")) {
      return <Tablet className="h-8 w-8 text-green-600" />
    } else if (lowerType.includes("rest api")) {
      return <Network className="h-8 w-8 text-green-600" />
    } else if (lowerType.includes("sftp") || lowerType.includes("ftp")) {
      return <FolderUp className="h-8 w-8 text-orange-500" />
    } else if (lowerType.includes("kafka")) {
      return <Zap className="h-8 w-8 text-purple-600" />
    }

    return <Database className="h-8 w-8 text-slate-500" />
  }

  const getDataSourceColor = (type: string) => {
    const lowerType = type?.toLowerCase() || ""

    if (lowerType.includes("javascript") || lowerType.includes("js") || lowerType.includes("web")) {
      return "border-blue-200 bg-blue-50"
    } else if (lowerType.includes("ios") || lowerType.includes("iphone")) {
      return "border-slate-300 bg-slate-50"
    } else if (lowerType.includes("android")) {
      return "border-green-200 bg-green-50"
    } else if (lowerType.includes("sftp") || lowerType.includes("ftp")) {
      return "border-orange-200 bg-orange-50"
    } else if (lowerType.includes("kafka")) {
      return "border-purple-200 bg-purple-50"
    }

    return "border-slate-200 bg-white"
  }

  useEffect(() => {
    fetchDataSources()
  }, [fetchDataSources])

  if (coreApiNotConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <p>Data Sources is not configured for this tenant.</p>
        <p className="text-sm">Contact your administrator to set up Core API access.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Sources</h2>
          <p className="text-slate-600">View and manage data sources for {tenant.displayName}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDataSources} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-600">Loading data sources...</span>
          </CardContent>
        </Card>
      ) : dataSources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-600 text-center">No data sources found for this tenant.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map(source => (
            <Card
              key={source.id}
              className={`cursor-pointer hover:shadow-lg transition-all ${getDataSourceColor(source.type)}`}
              onClick={() => handleSourceClick(source)}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getDataSourceIcon(source.sourceName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{source.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1 truncate">{source.sourceName}</p>
                      </div>
                      <Badge variant={source.status === "ACTIVE" ? "default" : "secondary"} className="flex-shrink-0">
                        {source.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Write Key:</span>
                    <code className="text-xs bg-white/50 px-2 py-1 rounded border flex items-center">
                      {source.writeKey}
                      <button
                        type="button"
                        className="ml-2 p-0.5"
                        title="Copy write key"
                        onClick={e => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(source.writeKey)
                        }}
                        tabIndex={-1}>
                        <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" aria-label="Copy" />
                      </button>
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Created:</span>
                    <span className="text-slate-900">{new Date(source.createdOn).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Creator:</span>
                    <span className="text-slate-900 truncate max-w-[150px]" title={source.creatorEmailId}>
                      {source.creatorEmailId}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
