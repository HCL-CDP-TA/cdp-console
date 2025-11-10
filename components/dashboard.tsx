"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Database,
  MapPin,
  Activity,
  TrendingUp,
  Users,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react"
import { Tenant, UserProperty, DataMapping } from "@/types/tenant"
import { trackDetailedUserAction, trackError } from "@/lib/analytics"

interface DashboardProps {
  tenant: Tenant | null
}

interface DashboardStats {
  totalProperties: number
  totalMappings: {
    analyze_post: number
    dataingestionpi: number
  }
  propertyTypes: Record<string, number>
  mappingFunctions: Record<string, number>
  profileFields: number
  mandatoryMappings: number
}

export const Dashboard = ({ tenant }: DashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalMappings: { analyze_post: 0, dataingestionpi: 0 },
    propertyTypes: {},
    mappingFunctions: {},
    profileFields: 0,
    mandatoryMappings: 0,
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!tenant) return

    setLoading(true)
    trackDetailedUserAction("refresh", "dashboard", { tenantId: tenant.clientId })

    try {
      // Fetch user properties
      const propertiesResponse = await fetch(`/api/user-properties/${tenant.clientId}`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      // Fetch mappings for both data sources
      const analyzePostResponse = await fetch(`/api/mappings/${tenant.clientId}/analyze_post`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      const dataIngestionResponse = await fetch(`/api/mappings/${tenant.clientId}/dataingestionapi`, {
        headers: {
          "x-api-key": tenant.apiKey,
          "x-api-endpoint": tenant.apiEndpoint,
          "Content-Type": "application/json",
        },
      })

      const properties: UserProperty[] = propertiesResponse.ok ? await propertiesResponse.json() : []
      const analyzePostMappings: DataMapping[] = analyzePostResponse.ok ? await analyzePostResponse.json() : []
      const dataIngestionMappings: DataMapping[] = dataIngestionResponse.ok ? await dataIngestionResponse.json() : []

      // Calculate statistics
      const propertyTypes: Record<string, number> = {}
      const mappingFunctions: Record<string, number> = {}
      let profileFields = 0
      let mandatoryMappings = 0

      // Process properties
      properties.forEach(prop => {
        propertyTypes[prop.dataType] = (propertyTypes[prop.dataType] || 0) + 1
      })

      // Process mappings
      ;[...analyzePostMappings, ...dataIngestionMappings].forEach(mapping => {
        mappingFunctions[mapping.ProfileUpdateFunction] = (mappingFunctions[mapping.ProfileUpdateFunction] || 0) + 1
        if (mapping.IsMandatory) mandatoryMappings++
        if (mapping.IsProfileField) profileFields++
      })

      setStats({
        totalProperties: properties.length,
        totalMappings: {
          analyze_post: analyzePostMappings.length,
          dataingestionpi: dataIngestionMappings.length,
        },
        propertyTypes,
        mappingFunctions,
        profileFields,
        mandatoryMappings,
      })

      setLastUpdated(new Date())

      // Track successful dashboard data load
      trackDetailedUserAction("view", "dashboard", {
        tenantId: tenant.clientId,
        totalProperties: properties.length,
        totalMappings: analyzePostMappings.length + dataIngestionMappings.length,
        analyzePostMappings: analyzePostMappings.length,
        dataIngestionMappings: dataIngestionMappings.length,
        profileFields,
        mandatoryMappings,
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      trackError("network_error", (error as Error).message, "dashboard")
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (!tenant) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
          <p className="text-slate-600">Please select a tenant to view dashboard metrics</p>
        </CardContent>
      </Card>
    )
  }

  const totalMappings = stats.totalMappings.analyze_post + stats.totalMappings.dataingestionpi
  const mappingCoverage = stats.totalProperties > 0 ? (totalMappings / stats.totalProperties) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600">Overview of {tenant.displayName} configuration</p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">{stats.profileFields} profile fields</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMappings}</div>
            <p className="text-xs text-muted-foreground">{stats.mandatoryMappings} mandatory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mapping Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mappingCoverage.toFixed(1)}%</div>
            <Progress value={mappingCoverage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Source Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Data Source Mappings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Web SDK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{stats.totalMappings.analyze_post}</span>
                <Badge variant="outline" className="text-xs">
                  {totalMappings > 0 ? ((stats.totalMappings.analyze_post / totalMappings) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Data Ingestion API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{stats.totalMappings.dataingestionpi}</span>
                <Badge variant="outline" className="text-xs">
                  {totalMappings > 0 ? ((stats.totalMappings.dataingestionpi / totalMappings) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Property Data Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.propertyTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <Badge variant="outline">{type}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(stats.propertyTypes).length === 0 && (
                <p className="text-sm text-slate-500">No properties configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Mapping Update Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats.mappingFunctions).map(([func, count]) => (
              <div key={func} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <Badge variant="outline" className="text-xs">
                  {func}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(stats.mappingFunctions).length === 0 && (
              <p className="text-sm text-slate-500 col-span-full">No mappings configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Configuration Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Properties</p>
                <p className="text-xs text-green-700">{stats.totalProperties} configured</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Mappings</p>
                <p className="text-xs text-blue-700">{totalMappings} configured</p>
              </div>
            </div>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                mappingCoverage >= 80 ? "bg-green-50" : mappingCoverage >= 50 ? "bg-yellow-50" : "bg-red-50"
              }`}>
              {mappingCoverage >= 80 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className={`h-5 w-5 ${mappingCoverage >= 50 ? "text-yellow-600" : "text-red-600"}`} />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    mappingCoverage >= 80
                      ? "text-green-900"
                      : mappingCoverage >= 50
                      ? "text-yellow-900"
                      : "text-red-900"
                  }`}>
                  Coverage
                </p>
                <p
                  className={`text-xs ${
                    mappingCoverage >= 80
                      ? "text-green-700"
                      : mappingCoverage >= 50
                      ? "text-yellow-700"
                      : "text-red-700"
                  }`}>
                  {mappingCoverage.toFixed(1)}% mapped
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
