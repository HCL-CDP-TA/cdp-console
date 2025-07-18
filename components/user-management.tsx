"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  Mail,
  Calendar,
  Clock,
  Edit2,
  ChevronUp,
  ChevronDown,
  KeyRound,
} from "lucide-react"
import { Tenant, User } from "@/types/tenant"
import { getAuthState, validateAuthState, clearAuthState } from "@/lib/auth"

interface UserManagementProps {
  tenant: Tenant
  onAuthExpired: () => void
}

export function UserManagement({ tenant, onAuthExpired }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    userName: "",
    recipientEmail: "",
  })
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })
  const [authError, setAuthError] = useState(false)
  const [sortField, setSortField] = useState<keyof User | "name" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [resetPasswordData, setResetPasswordData] = useState({
    username: "",
    emailAddress: "",
  })
  const [emailValidationError, setEmailValidationError] = useState("")
  const [statusUpdateUser, setStatusUpdateUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/users/${tenant.clientId}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        console.error("Failed to fetch users:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/users/${tenant.clientId}/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchUsers() // Refresh the user list
        setIsAddDialogOpen(false)
        setFormData({ userName: "", recipientEmail: "" }) // Reset form
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        const errorData = await response.json()
        console.error("Failed to create user:", errorData.error)
      }
    } catch (error) {
      console.error("Error creating user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      firstName: user.Firstname || "",
      lastName: user.Lastname || "",
      email: user.Email,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/users/${tenant.clientId}/update-profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          email: editFormData.email,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("User profile updated successfully:", data.message)
        await fetchUsers() // Refresh the user list
        setIsEditDialogOpen(false)
        setEditingUser(null)
        setEditFormData({ firstName: "", lastName: "", email: "" }) // Reset form
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        const errorData = await response.json()
        console.error("Failed to update user profile:", errorData.error)
      }
    } catch (error) {
      console.error("Error updating user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate email address
    if (!resetPasswordData.emailAddress.includes("@")) {
      setEmailValidationError("Please enter a valid email address")
      return
    }

    setEmailValidationError("")
    setLoading(true)

    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/users/${tenant.clientId}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: resetPasswordData.username,
          emailAddress: resetPasswordData.emailAddress,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Password reset email sent successfully:", data.message)
        setIsResetPasswordDialogOpen(false)
        setResetPasswordData({ username: "", emailAddress: "" }) // Reset form
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        const errorData = await response.json()
        console.error("Failed to send password reset email:", errorData.error)
      }
    } catch (error) {
      console.error("Error sending password reset email:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (user: User, newStatus: boolean) => {
    setLoading(true)

    try {
      const authState = getAuthState()
      if (!authState.token) {
        console.error("No auth token available")
        return
      }

      const response = await fetch(`/api/users/${tenant.clientId}/update-status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authState.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user.Email,
          isActive: newStatus,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("User status updated successfully:", data.message)
        await fetchUsers() // Refresh the user list
        setStatusUpdateUser(null)
      } else if (response.status === 401) {
        console.log("Authentication expired - redirecting to login")
        onAuthExpired?.()
        return
      } else {
        const errorData = await response.json()
        console.error("Failed to update user status:", errorData.error)
      }
    } catch (error) {
      console.error("Error updating user status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof User | "name") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: keyof User | "name") => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  useEffect(() => {
    fetchUsers()
  }, [tenant])

  const filteredUsers = users
    .filter(
      user =>
        user.Email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Lastname.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortField) return 0

      let aValue: string | number = ""
      let bValue: string | number = ""

      switch (sortField) {
        case "name":
          aValue = `${a.Firstname} ${a.Lastname}`.toLowerCase()
          bValue = `${b.Firstname} ${b.Lastname}`.toLowerCase()
          break
        case "Email":
          aValue = a.Email.toLowerCase()
          bValue = b.Email.toLowerCase()
          break
        case "isActive":
          aValue = a.isActive ? 1 : 0
          bValue = b.isActive ? 1 : 0
          break
        case "CreatedOn":
          aValue = new Date(a.CreatedOn).getTime()
          bValue = new Date(b.CreatedOn).getTime()
          break
        case "lastLogin":
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0
          break
        default:
          if (sortField in a) {
            aValue = String(a[sortField]).toLowerCase()
            bValue = String(b[sortField]).toLowerCase()
          }
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600">Manage users for {tenant.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Username</Label>
                    <Input
                      id="userName"
                      value={formData.userName}
                      onChange={e => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                      placeholder="Enter username (e.g., hcl_username)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Email Address</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={formData.recipientEmail}
                      onChange={e => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setFormData({ userName: "", recipientEmail: "" })
                    }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit User Profile Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      type="text"
                      value={editFormData.firstName}
                      onChange={e => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      type="text"
                      value={editFormData.lastName}
                      onChange={e => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email (Username)</Label>
                    <Input id="edit-email" type="email" value={editFormData.email} disabled className="bg-slate-50" />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      setEditingUser(null)
                      setEditFormData({ firstName: "", lastName: "", email: "" })
                    }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Password Reset Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Reset Password
                </DialogTitle>
              </DialogHeader>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Security Warning:</strong> This will send password reset instructions to the specified email
                  address. Please verify the email address is correct before proceeding.
                </p>
              </div>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-username">Username</Label>
                    <Input
                      id="reset-username"
                      type="text"
                      value={resetPasswordData.username}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">Username cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetPasswordData.emailAddress}
                      onChange={e => {
                        setResetPasswordData(prev => ({ ...prev, emailAddress: e.target.value }))
                        if (emailValidationError) setEmailValidationError("")
                      }}
                      placeholder="Enter email address to receive reset instructions"
                      required
                      className={emailValidationError ? "border-red-500" : ""}
                    />
                    {emailValidationError && <p className="text-xs text-red-600">{emailValidationError}</p>}
                    <p className="text-xs text-slate-500">
                      Password reset instructions will be sent to this email address.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsResetPasswordDialogOpen(false)
                      setResetPasswordData({ username: "", emailAddress: "" })
                      setEmailValidationError("")
                    }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} variant="destructive">
                    {loading ? "Sending..." : "Send Reset Email"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length} total)
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold text-left justify-start"
                      onClick={() => handleSort("name")}>
                      Name
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold text-left justify-start"
                      onClick={() => handleSort("Email")}>
                      Username
                      {getSortIcon("Email")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold text-left justify-start"
                      onClick={() => handleSort("isActive")}>
                      Status
                      {getSortIcon("isActive")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold text-left justify-start"
                      onClick={() => handleSort("CreatedOn")}>
                      Created
                      {getSortIcon("CreatedOn")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold text-left justify-start"
                      onClick={() => handleSort("lastLogin")}>
                      Last Login
                      {getSortIcon("lastLogin")}
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.Firstname} {user.Lastname}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="medium">{user.Email}</div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => setStatusUpdateUser(user)}
                            disabled={loading}>
                            <Badge
                              variant="outline"
                              className={`cursor-pointer hover:opacity-80 ${
                                user.isActive
                                  ? "bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 border-red-300 text-red-800 hover:bg-red-200"
                              }`}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{user.isActive ? "Deactivate" : "Activate"} User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to {user.isActive ? "deactivate" : "activate"} user "
                              {user.Firstname} {user.Lastname}" ({user.Email})?
                              {user.isActive ? (
                                <span className="block mt-2 text-amber-600 font-medium">
                                  Deactivating this user will prevent them from accessing the system.
                                </span>
                              ) : null}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusUpdate(user, !user.isActive)}
                              className={
                                user.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                              }>
                              {user.isActive ? "Deactivate" : "Activate"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(user.CreatedOn)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} disabled={loading}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetPasswordData({ username: user.Email, emailAddress: "" })
                            setEmailValidationError("")
                            setIsResetPasswordDialogOpen(true)
                          }}
                          disabled={loading}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {authError
                  ? "Authentication expired. Please log in again."
                  : searchTerm
                  ? "No users match your search."
                  : loading
                  ? "Loading users..."
                  : "No users found."}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredUsers.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-slate-600 whitespace-nowrap">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
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
  )
}
