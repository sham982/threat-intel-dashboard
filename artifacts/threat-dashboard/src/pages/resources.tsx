import { useState } from "react";
import { useListResources, useCreateResource, useUpdateResource, useDeleteResource, ResourceCategory } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Plus, Trash2, Edit, Server, Globe, Shield, BookOpen, Activity } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

const resourceSchema = z.object({
  category: z.enum(["ip_check", "url_check", "malware_check", "cyber_threat_intelligence"]),
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

export default function Resources() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: resources, isLoading } = useListResources();
  const [activeTab, setActiveTab] = useState<string>("ip_check");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      category: "ip_check",
      name: "",
      url: "",
      description: "",
    },
  });

  const canEdit = user?.role === "admin" || user?.role === "analyst";

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({
      category: activeTab as any,
      name: "",
      url: "",
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (resource: any) => {
    setEditingId(resource.id);
    form.reset({
      category: resource.category,
      name: resource.name,
      url: resource.url,
      description: resource.description || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ResourceFormValues) => {
    if (editingId) {
      updateResource.mutate({
        id: editingId,
        data
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
          setIsDialogOpen(false);
        }
      });
    } else {
      createResource.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this resource?")) {
      deleteResource.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        }
      });
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'ip_check': return <Server className="w-4 h-4" />;
      case 'url_check': return <Globe className="w-4 h-4" />;
      case 'malware_check': return <Shield className="w-4 h-4" />;
      case 'cyber_threat_intelligence': return <BookOpen className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const categories = [
    { id: "ip_check", label: "IP Tools" },
    { id: "url_check", label: "URL & Domain" },
    { id: "malware_check", label: "Malware Analysis" },
    { id: "cyber_threat_intelligence", label: "CTI Sources" },
  ];

  const filteredResources = resources?.filter(r => r.category === activeTab) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight uppercase">SOC Cheatsheet</h1>
          <p className="text-sm text-muted-foreground font-mono tracking-widest">EXTERNAL REFERENCE TOOLS</p>
        </div>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="font-mono text-xs uppercase tracking-widest shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-mono uppercase tracking-widest text-lg">
                  {editingId ? "Edit Resource" : "New Resource"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono bg-background/50">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={c.id} className="font-mono">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono bg-background/50" placeholder="e.g. VirusTotal" />
                      </FormControl>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="url" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">URL</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono bg-background/50" placeholder="https://" />
                      </FormControl>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono bg-background/50" />
                      </FormControl>
                      <FormMessage className="text-xs font-mono" />
                    </FormItem>
                  )} />
                  <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="font-mono text-xs uppercase">Cancel</Button>
                    <Button type="submit" className="font-mono text-xs uppercase" disabled={createResource.isPending || updateResource.isPending}>
                      {editingId ? "Update" : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/50 border border-border/50 h-12 p-1 w-full justify-start overflow-x-auto flex-nowrap rounded-lg">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id}
              className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 whitespace-nowrap"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Activity className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center p-12 bg-card/20 rounded-lg border border-border/50 border-dashed">
              <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">NO RESOURCES IN THIS CATEGORY</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResources.map((resource, i) => (
                <Card 
                  key={resource.id} 
                  className="bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60 hover:border-primary/50 transition-all duration-300 group animate-in fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-base font-bold font-mono">
                        {getCategoryIcon(resource.category)}
                        {resource.name}
                      </CardTitle>
                      {resource.description && (
                        <CardDescription className="text-xs line-clamp-2">{resource.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(resource)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(resource.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-full h-9 rounded-md bg-primary/10 text-primary font-mono text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Launch Tool <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
