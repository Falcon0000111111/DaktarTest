
"use client";

import { useState } from "react";
import type { Profile } from "@/types/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditUserLimitDialog } from "./edit-user-limit-dialog";

interface UserManagementTableProps {
  initialUsers: Profile[];
}

export function UserManagementTable({ initialUsers }: UserManagementTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEditClick = (user: Profile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleUserUpdated = (updatedUser: Profile) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setSelectedUser(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View users and manage their quiz generation limits.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile view: Card list */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs">{user.id}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                    <Edit className="mr-2 h-3 w-3" /> Edit
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Used</p>
                    <p className="font-medium">{user.llm_requests_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Limit</p>
                    <p className="font-medium">{user.llm_request_limit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop view: Table */}
          <div className="hidden md:block border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requests Used</TableHead>
                  <TableHead>Request Limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.llm_requests_count}</TableCell>
                    <TableCell>{user.llm_request_limit}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                        <Edit className="mr-2 h-3 w-3" /> Edit Limit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <EditUserLimitDialog
        user={selectedUser}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onUserUpdated={handleUserUpdated}
      />
    </>
  );
}
