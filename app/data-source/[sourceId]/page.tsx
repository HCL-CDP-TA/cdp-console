"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"
import AppLayout from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Clock,
  ClockAlert,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  LucideIcon,
  File,
  FileText,
  MousePointerClick,
  User,
  Smartphone,
  LogIn,
  LogOut,
  Copy,
} from "lucide-react"

interface Event {
  messageId: string
  timestamp: string
  type: string
  userId?: string
  name: string
  properties: Record<string, any>
}

// JSON Property Viewer Component
function JsonProperty({ name, value, level = 0 }: { name: string; value: any; level?: number }) {
  const [isOpen, setIsOpen] = useState(level === 0)
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value)
  const isArray = Array.isArray(value)
  const isExpandable = isObject || isArray

  const renderValue = () => {
    if (value === null) return <span className="text-slate-400">null</span>
    if (value === undefined) return <span className="text-slate-400">undefined</span>
    if (typeof value === "string") return <span className="text-green-600">&quot;{value}&quot;</span>
    if (typeof value === "number") return <span className="text-blue-600">{value}</span>
    if (typeof value === "boolean") return <span className="text-purple-600">{value.toString()}</span>
    return <span className="text-slate-600">{String(value)}</span>
  }

  if (!isExpandable) {
    return (
      <div className="flex gap-2 py-0.5" style={{ paddingLeft: `${level * 16}px` }}>
        <span className="text-slate-700 font-medium">{name}:</span>
        {renderValue()}
      </div>
    )
  }

  const entries = isArray ? value : Object.entries(value)
  const count = isArray ? value.length : Object.keys(value).length

  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 py-0.5 hover:bg-slate-100 rounded px-1 -mx-1 w-full text-left">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          )}
          <span className="text-slate-700 font-medium">{name}:</span>
          <span className="text-slate-500 text-sm">{isArray ? `[${count}]` : `{${count}}`}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {isArray
            ? value.map((item: any, index: number) => (
                <JsonProperty key={index} name={`[${index}]`} value={item} level={level + 1} />
              ))
            : Object.entries(value).map(([key, val]) => (
                <JsonProperty key={key} name={key} value={val} level={level + 1} />
              ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default function DataSourcePage() {
  const params = useParams()
  const router = useRouter()
  const sourceId = params.sourceId as string

  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const socketRef = useRef<Socket | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [leftPaneWidth, setLeftPaneWidth] = useState(30) // percentage
  const [isResizing, setIsResizing] = useState(false)

  // Fetch profile data based on event ID
  const fetchProfileData = useCallback(async (eventId: string) => {
    if (!eventId) return

    setProfileLoading(true)
    setProfileError(null)

    try {
      // Get tenant information
      const selectedTenantId = localStorage.getItem("selectedTenantId")
      if (!selectedTenantId) {
        throw new Error("No tenant selected")
      }

      const storedTenant = JSON.parse(localStorage.getItem(`tenant-${selectedTenantId}`) || "{}")
      if (!storedTenant.clientId || !storedTenant.apiKey || !storedTenant.apiEndpoint) {
        throw new Error("Tenant missing required API configuration")
      }

      console.log("Fetching profile data for event ID:", eventId)

      // Call the server-side API route
      const response = await fetch(`/api/profile/${encodeURIComponent(eventId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": storedTenant.clientId,
          "x-api-key": storedTenant.apiKey,
          "x-api-endpoint": storedTenant.apiEndpoint,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch profile: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Profile data received:", data)
      setProfileData(data)
    } catch (error: any) {
      console.error("Error fetching profile data:", error)
      setProfileError(error.message || "Failed to load profile data")
      setProfileData(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Update current time every second for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch profile data when event is selected
  useEffect(() => {
    if (selectedEvent?.properties?.id) {
      fetchProfileData(selectedEvent.properties.id)
    } else {
      setProfileData(null)
      setProfileError(null)
    }
  }, [selectedEvent, fetchProfileData])

  // Handle resizing of panes
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return

      const container = document.getElementById("resizable-container")
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 20% and 60%
      if (newWidth >= 20 && newWidth <= 60) {
        setLeftPaneWidth(newWidth)
      }
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Helper function to get badge variant based on event type
  const getEventBadgeVariant = (type: string): string => {
    const eventType = type?.toLowerCase()

    switch (eventType) {
      case "track":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "page":
        return "bg-green-100 text-green-700 border-green-200"
      case "identify":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "screen":
        return "bg-cyan-100 text-cyan-700 border-cyan-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const getEventIcon = (type: string, name: string): LucideIcon => {
    switch (type.toLowerCase()) {
      case "page":
        return FileText
      case "track":
        switch (name.toLowerCase()) {
          case "user_session_start":
            return Clock
          case "user_session_end":
            return ClockAlert
          case "user_login":
            return LogIn
          case "user_logout":
            return LogOut
          default:
            return MousePointerClick
        }
      case "identify":
        return User
      case "screen":
        return Smartphone
      default:
        return File
    }
  }

  // Helper function to get event title based on type
  const getEventTitle = (event: Event): string => {
    const type = event.type?.toLowerCase()
    const props = event.properties || {}

    // Track event - look for event name
    if (type === "track") {
      return props.event || props.eventName || props.name || event.type
    }

    // Page event - look for path or url
    if (type === "page") {
      return props.path || props.url || props.page || props.pagePath || props.name || event.type
    }

    // Identify event - use userId
    if (type === "identify") {
      return event.userId || props.userId || props.user_id || props.id || event.type
    }

    // Fallback to event type
    return event.type || "Unknown Event"
  }

  // Get core API token
  const getCoreApiToken = async (): Promise<string | null> => {
    try {
      // Check if we have stored CDP login credentials from any tenant
      const selectedTenantId = localStorage.getItem("selectedTenantId")
      if (!selectedTenantId) {
        console.error("No tenant selected")
        return null
      }

      const storedTenant = JSON.parse(localStorage.getItem(`tenant-${selectedTenantId}`) || "{}")

      if (storedTenant.coreApiUsername && storedTenant.coreApiPassword) {
        console.log("Socket.IO - Using stored CDP credentials from tenant:", selectedTenantId)

        const response = await fetch("/api/core-auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: storedTenant.coreApiUsername,
            password: storedTenant.coreApiPassword, // Already hashed
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const token = data.access_token
          console.log("Socket.IO - Got core token:", token?.substring(0, 30) + `... (length: ${token?.length})`)
          return token
        }
      }

      console.error("No stored CDP credentials found")
      return null
    } catch (error) {
      console.error("Error getting core token:", error)
      return null
    }
  }

  // Initialize Socket.IO connection
  useEffect(() => {
    const connectSocket = async () => {
      const authToken = await getCoreApiToken()

      if (!authToken) {
        setConnectionError(
          "Core API token not found. Please navigate to Data Sources or Customer One View first to authenticate.",
        )
        console.error("Core token is missing! Cannot connect to Socket.IO without core token.")
        return
      }

      console.log("Using CORE token for Socket.IO:", authToken.substring(0, 30) + `... (length: ${authToken.length})`)

      // Create socket connection with manual query string in URL
      const socket = io(`https://ls.dev.hxcd.now.hclsoftware.cloud/?auth=${authToken}`, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      })

      socketRef.current = socket

      // Connection event handlers
      socket.on("connect", () => {
        console.log("✅ Socket.IO connected", socket.id)
        setIsConnected(true)
        setConnectionError(null)

        // Subscribe to live events for this source after connecting
        setTimeout(() => {
          console.log("📡 Subscribing to live events for source:", sourceId)
          socket.emit("subscribe", {
            id: sourceId,
            type: "source",
          })
        }, 1000) // Wait 1 second after connection to subscribe
      })

      socket.on("disconnect", reason => {
        console.log("Socket.IO disconnected:", reason)
        setIsConnected(false)
        if (reason === "io server disconnect") {
          console.error("Server rejected the connection - check authentication")
          setConnectionError("Server disconnected - authentication may have failed")
        }
      })

      socket.on("connect_error", error => {
        console.error("Socket.IO connection error:", error)
        setConnectionError(error.message)
        setIsConnected(false)
      })

      socket.on("error", error => {
        console.error("Socket.IO error:", error)
        setConnectionError(error.toString())
      })

      // Listen for all events (catch-all for debugging)
      socket.onAny((eventName, ...args) => {
        console.log(`🔔 Socket.IO received event "${eventName}":`, args)
      })

      // Listen for live_events (the actual event stream)
      socket.on("live_events", (events: any) => {
        console.log("📥 Received live_events:", events)

        // Handle array of events or single event
        const eventArray = Array.isArray(events) ? events : [events]

        eventArray.forEach((event: any) => {
          const formattedEvent: Event = {
            messageId: event.data.messageId,
            timestamp: event.ts,
            type: event.type || event.eventType || "unknown",
            userId: event.userId || "",
            name: event.data.name || event.eventName || "",
            properties: event.data || {},
          }

          // Debug log for non-track events
          if (formattedEvent.type.toLowerCase() !== "track") {
            console.log(`🐛 ${formattedEvent.type} event structure:`, {
              type: formattedEvent.type,
              userId: formattedEvent.userId,
              properties: formattedEvent.properties,
            })
          }

          setEvents(prevEvents => [formattedEvent, ...prevEvents])
          setSelectedEvent(prev => prev || formattedEvent)
        })
      })

      console.log("✅ Socket.IO event listeners configured")
    }

    // Start connection
    connectSocket()

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log("🔌 Unsubscribing and cleaning up socket connection")
        // Unsubscribe from live events
        socketRef.current.emit("unsubscribe", {
          id: sourceId,
          type: "source",
        })
        socketRef.current.disconnect()
        setEvents([]) // Clear events on unmount
      }
    }
  }, [sourceId]) // Re-run if sourceId changes

  const handleRefresh = () => {
    setLoading(true)
    // TODO: Refresh events from API
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Live Data Source Events</h1>
              <p className="text-sm text-slate-600">Source ID: {sourceId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Disconnected</span>
                </>
              )}
            </div>
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Connection error: {connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Two Column Layout */}
        <div id="resizable-container" className="flex gap-0 h-[calc(100vh-200px)] relative">
          {/* Left Column - Events List */}
          <Card className="flex flex-col" style={{ width: `${leftPaneWidth}%` }}>
            <CardHeader>
              <CardTitle className="text-base">Live Events ({events.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Clock className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">Waiting for events...</p>
                  <p className="text-sm text-slate-500 mt-2">Events will appear here as they come in</p>
                </div>
              ) : (
                events.map((event, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvent?.messageId === event.messageId
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`inline-block px-2 py-1 ml-3 text-sm font-medium rounded-md border ${getEventBadgeVariant(
                            event.type,
                          )}`}>
                          {(() => {
                            const Icon = getEventIcon(event.type, event.name)
                            return <Icon className="inline h-5 w-5 font-bold align-text-bottom" />
                          })()}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">{event.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {getRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    {event.userId && event.type?.toLowerCase() !== "identify" && (
                      <div className="text-xs text-slate-600 mt-1">User: {event.userId}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Resizable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 hover:w-2 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-all flex-shrink-0 ${
              isResizing ? "bg-blue-500 w-2" : ""
            }`}
            style={{ cursor: "col-resize" }}
          />

          {/* Right Column - Event Details */}
          <Card className="flex flex-col flex-1">
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!selectedEvent ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">Select an event to view details</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Event Metadata */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Message ID</label>
                      <p className="font-mono text-sm mt-1">{selectedEvent.messageId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Event Name</label>
                      <p className="text-sm mt-1">
                        <span
                          className={`inline-block px-2 py-1 mr-3 text-sm font-medium rounded-md border ${getEventBadgeVariant(
                            selectedEvent.type,
                          )}`}>
                          {(() => {
                            const Icon = getEventIcon(selectedEvent.type, selectedEvent.name)
                            return <Icon className="inline h-5 w-5 font-bold align-text-bottom" />
                          })()}
                        </span>
                        {selectedEvent.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Timestamp</label>
                      <p className="text-sm mt-1">{formatTimestamp(selectedEvent.timestamp)}</p>
                      <p className="text-xs text-slate-500">{getRelativeTime(selectedEvent.timestamp)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">User ID</label>
                      <p className="text-sm mt-1">
                        {selectedEvent.userId == "" ? "Not provided" : selectedEvent.userId}
                      </p>
                    </div>
                    {profileData?.key && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Profile Key</label>
                        <p className="text-sm mt-1">
                          <a
                            href="#"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                            onClick={e => e.preventDefault()}>
                            {profileData.key}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Properties */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-slate-600">Payload</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedEvent.properties, null, 2))
                        }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </Button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono">
                      {Object.keys(selectedEvent.properties).length === 0 ? (
                        <span className="text-slate-400">No properties</span>
                      ) : (
                        Object.entries(selectedEvent.properties).map(([key, value]) => (
                          <JsonProperty key={key} name={key} value={value} level={0} />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Profile Information */}
                  {selectedEvent.properties?.id && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600">Profile Information</label>
                        {profileData && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(profileData, null, 2))
                            }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy JSON
                          </Button>
                        )}
                      </div>

                      {profileLoading ? (
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-center">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                          <p className="text-slate-600">Loading profile data...</p>
                        </div>
                      ) : profileError ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{profileError}</AlertDescription>
                        </Alert>
                      ) : profileData ? (
                        <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono">
                          {Object.entries(profileData).map(([key, value]) => (
                            <JsonProperty key={key} name={key} value={value} level={0} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-center">
                          <p className="text-slate-400">No profile data available</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
