import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, ListUsersRole } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Search, Trash2, Activity, UserPlus, Edit, Shield } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const userSchema = z.object({
  username: z.string().min(3, "Minimum 3 characters"),
  email: z.string().email("Invalid email"),
  fullName: z.string().optional(),
  password: z.string().min(8, "Minimum 8 characters").optional(),
  role: z.enum(["admin", "analyst", "viewer"]),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const queryParams: any = {};
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (roleFilter !== "all") queryParams.role = roleFilter as ListUsersRole;

  const { data: users, isLoading } = useListUsers(queryParams);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      password: "",
      role: "analyst",
      isActive: true,
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({
      username: "",
      email: "",
      fullName: "",
      password: "",
      role: "analyst",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingId(user.id);
    form.reset({
      username: user.username,
      email: user.email,
      fullName: user.fullName || "",
      password: "", // don't populate password
      role: user.role,
      isActive: user.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    if (editingId) {
      const payload: any = { ...data };
      if (!payload.password) delete payload.password; // don't send empty password

      updateUser.mutate({
        id: editingId,
        data: payload
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setIsDialogOpen(false);
        }
      });
    } else {
      if (!data.password) {
        form.setError("password", { type: "manual", message: "Password is required for new users" });
        return;
      }
      createUser.mutate({ data: data as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this user? This action cannot be undone.")) {
      deleteUser.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        }
      });
    }
  };

  const handleToggleActive = (id: number, currentStatus: boolean) => {
    updateUser.mutate({
      id,
      data: { isActive: !currentStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      }
    });
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-primary/20 text-primary border-primary/50",
      analyst: "bg-info/20 text-info border-info/50",
      viewer: "bg-muted text-muted-foreground border-border",
    }[role] || "bg-muted text-muted-foreground border-border";

    return (
      <Badge variant="outline" className={`font-mono uppercase text-[10px] ${styles}`}>
        {role === "admin" && <Shield className="w-3 h-3 mr-1" />}
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Personnel Management</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">ACCESS CONTROL & IDENTITIES</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search username or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 font-mono"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] bg-background/50 font-mono">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="h-auto font-mono text-xs uppercase tracking-widest shrink-0">
              <UserPlus className="w-4 h-4 mr-2" /> Provision Operator
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-widest text-lg">
                {editingId ? "Update Identity" : "Provision Identity"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Callsign (Username)</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono bg-background/50" disabled={!!editingId} />
                      </FormControl>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Clearance Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono bg-background/50">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin" className="font-mono">Admin</SelectItem>
                          <SelectItem value="analyst" className="font-mono">Analyst</SelectItem>
                          <SelectItem value="viewer" className="font-mono">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                </div>
                
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className="font-mono bg-background/50" />
                    </FormControl>
                    <FormMessage className="text-xs font-mono" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono bg-background/50" />
                    </FormControl>
                    <FormMessage className="text-xs font-mono" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-mono text-muted-foreground">
                      Access Code {editingId && <span className="text-[10px] normal-case">(Leave blank to keep current)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••••••" className="font-mono bg-background/50" />
                    </FormControl>
                    <FormMessage className="text-xs font-mono" />
                  </FormItem>
                )} />

                {editingId && (
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs uppercase font-mono text-foreground">Active Status</FormLabel>
                        <p className="text-[10px] text-muted-foreground font-mono">Allow identity to authenticate</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                )}

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="font-mono text-xs uppercase">Cancel</Button>
                  <Button type="submit" className="font-mono text-xs uppercase" disabled={createUser.isPending || updateUser.isPending}>
                    {editingId ? "Update" : "Provision"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto rounded-md">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase">Identity</TableHead>
                <TableHead className="font-mono text-xs uppercase">Clearance</TableHead>
                <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase">Last Authenticated</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Activity className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Accessing Records...</span>
                  </TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    NO IDENTITIES FOUND
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u, i) => (
                  <TableRow key={u.id} className="border-border/50 group animate-in fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold">{u.username}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={u.isActive} 
                          onCheckedChange={() => handleToggleActive(u.id, u.isActive)}
                          disabled={updateUser.isPending}
                          className="data-[state=checked]:bg-success"
                        />
                        <span className={`text-[10px] font-mono uppercase tracking-widest ${u.isActive ? 'text-success' : 'text-muted-foreground'}`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.lastLogin ? format(new Date(u.lastLogin), "MMM dd, yyyy HH:mm") : "NEVER"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteUser.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
