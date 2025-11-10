"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Layers, Hash, TrendingUp } from "lucide-react"
import { Tenant } from "@/types/tenant"
import type { ChannelPriority as ChannelPriorityType } from "@/types/tenant"
import { getAuthState, clearAuthState } from "@/lib/auth"
import { trackAPICall, trackDetailedUserAction, trackError } from "@/lib/analytics"

interface ChannelPriorityProps {
  tenant: Tenant
  onAuthExpired: () => void
}

export const ChannelPriority = ({ tenant, onAuthExpired }: ChannelPriorityProps) => {
  const [priorities, setPriorities] = useState<ChannelPriorityType[]>([])
  const [loading, setLoading] = useState(false)

  const fetchChannelPriority = useCallback(async () => {
    setLoading(true)
    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/channel-priority/${tenant.clientId}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Sort by priority for better display
        const sortedData = data.sort((a: ChannelPriorityType, b: ChannelPriorityType) => a.Priority - b.Priority)
        setPriorities(sortedData)
        trackAPICall(`/api/channel-priority/${tenant.clientId}`, "GET", true)
        trackDetailedUserAction("refresh", "channel_priority", {
          channelCount: sortedData.length,
          tenantId: tenant.clientId,
        })
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        trackAPICall(`/api/channel-priority/${tenant.clientId}`, "GET", false)
        trackError(
          "authentication_expired",
          `Failed to fetch channel priority: ${response.statusText}`,
          "channel_priority",
        )
        clearAuthState()
        onAuthExpired()
        return
      } else {
        console.error("Failed to fetch channel priority:", response.statusText)
        trackAPICall(`/api/channel-priority/${tenant.clientId}`, "GET", false)
        trackError("api_error", `Failed to fetch channel priority: ${response.statusText}`, "channel_priority")
        setPriorities([])
      }
    } catch (error) {
      console.error("Error fetching channel priority:", error)
      trackError("network_error", (error as Error).message, "channel_priority")
      setPriorities([])
    } finally {
      setLoading(false)
    }
  }, [tenant.clientId, onAuthExpired])

  useEffect(() => {
    fetchChannelPriority()
  }, [fetchChannelPriority])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Channel Priority</h2>
          <p className="text-slate-600">Identity resolution priority for {tenant.displayName}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchChannelPriority()
            trackDetailedUserAction("refresh", "channel_priority", { tenantId: tenant.clientId })
          }}
          disabled={loading}
          className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Channels</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(priorities.map(p => p.KeyName)).size}</div>
            <p className="text-xs text-muted-foreground">Unique channel types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Priorities</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priorities.length}</div>
            <p className="text-xs text-muted-foreground">Priority configurations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Range</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {priorities.length > 0
                ? `${Math.min(...priorities.map(p => p.Priority))} - ${Math.max(...priorities.map(p => p.Priority))}`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Min - Max priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Channel Priority Configuration ({priorities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel Key</TableHead>
                  <TableHead>Priority Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorities.map((priority, index) => (
                  <TableRow key={`${priority.KeyName}-${priority.Priority}-${index}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {priority.KeyName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{priority.Priority}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {priorities.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {loading ? "Loading channel priorities..." : "No channel priorities found."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
