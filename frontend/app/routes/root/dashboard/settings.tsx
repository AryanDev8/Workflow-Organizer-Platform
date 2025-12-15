import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader, AlertTriangle, Trash2, ArrowLeftRight, Check } from "lucide-react";
import { type z } from "zod";

// --- IMPORTS ---
import { 
  useGetWorkspaceDetailsQuery, 
  useUpdateWorkspace, 
  useDeleteWorkspace,
  useTransferWorkspace 
} from "../../../hooks/use-workspace";

// IMPORTANT: Adjust this path to point to your actual schema file
import { workspaceSchema } from "../../../lib/schema"; 
import { cn } from "../../../lib/utils";

// --- UI COMPONENTS ---
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "../../../components/ui/dialog";

// Colors
const colorOptions = [
  "#FF5733", "#33C1FF", "#28A745", "#FFC300", 
  "#8E44AD", "#E67E22", "#2ECC71", "#34495E",
];

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export default function SettingsPage() {
  const navigate = useNavigate();
  // Getting ID from Query Params based on your URL structure (?workspaceId=...)
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") || "";

  // State for Transfer Modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // --- HOOKS ---
  // Fetch details (including members for the transfer list)
  const { data: workspaceData, isLoading: isLoadingWorkspace } = useGetWorkspaceDetailsQuery(workspaceId);
  const { mutate: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();
  const { mutate: transferWorkspace, isPending: isTransferring } = useTransferWorkspace();

  // FIX: Cast workspace data to 'any' to avoid strict type errors in VS Code
  const workspace = workspaceData as any;

  // --- FORM SETUP ---
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      description: "",
      color: colorOptions[0],
    },
  });

  // Pre-fill form
  useEffect(() => {
    if (workspace) {
      form.reset({
        name: workspace.name,
        description: workspace.description || "",
        color: workspace.color || colorOptions[0],
      });
    }
  }, [workspace, form]);

  // --- HANDLERS ---
  const onSubmit = (data: WorkspaceFormValues) => {
    if (!workspaceId) return;
    updateWorkspace({ workspaceId, formData: data as any }, {
      onSuccess: () => {
        toast.success("Workspace updated successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to update workspace");
      }
    });
  };

  const handleDelete = () => {
    if (!workspaceId) return;
    deleteWorkspace(workspaceId, {
      onSuccess: () => {
        toast.success("Workspace deleted");
        navigate("/workspaces"); 
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to delete workspace");
      }
    });
  };

  const handleTransfer = () => {
    if(!selectedMemberId || !workspaceId) return;
    
    transferWorkspace({ 
        workspaceId, 
        newOwnerId: selectedMemberId 
    }, {
        onSuccess: () => {
            toast.success("Ownership transferred successfully");
            setTransferOpen(false);
            navigate("/dashboard"); // Redirect to dashboard to refresh permissions
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to transfer ownership");
        }
    });
  };

  // --- RENDERING ---

  if (isLoadingWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-y-4">
            <AlertTriangle className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Workspace not found.</p>
        </div>
    )
  }

  // Safe access to members for the transfer list
  // Note: We filter out the current user because you can't transfer to yourself
  // We assume 'workspace.owner' is the ID of the current owner
  const members = (workspace?.members || []).filter(
      (member: any) => member.user?._id !== workspace.owner
  );

  return (
    <div className="flex flex-col gap-y-8 p-6 w-full max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your workspace settings and preferences.</p>
      </div>

      {/* 1. UPDATE FORM */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter workspace name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                        {...field}
                        rows={3}
                        placeholder="Describe your workspace"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-3 flex-wrap">
                      {colorOptions.map((color) => (
                        <div
                          key={color}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "w-6 h-6 rounded-full cursor-pointer hover:opacity-80 transition-all duration-300",
                            field.value === color && "ring-2 ring-offset-2 ring-blue-500"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                    {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* 2. TRANSFER WORKSPACE */}
      <div className="border rounded-lg p-6 bg-white shadow-sm flex flex-col gap-y-4">
        <div>
            <h3 className="text-lg font-semibold">Transfer Workspace</h3>
            <p className="text-sm text-muted-foreground">
                Transfer ownership of this workspace to another member.
            </p>
        </div>
        <div className="flex justify-start">
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-fit">
                        Transfer Workspace
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer Workspace Ownership</DialogTitle>
                        <DialogDescription>
                            Select a member to transfer ownership of this workspace. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 py-4">
                        {members.length > 0 ? (
                            members.map((member: any) => (
                                <div 
                                    key={member._id}
                                    // IMPORTANT: We select the USER ID (member.user._id), not the member document ID
                                    onClick={() => setSelectedMemberId(member.user?._id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50",
                                        selectedMemberId === member.user?._id && "border-blue-500 bg-blue-50"
                                    )}
                                >
                                    <div className="flex items-center gap-x-3">
                                        <Avatar className="size-8">
                                            <AvatarImage src={member.user?.profilePicture} />
                                            <AvatarFallback>{member.user?.name?.[0] || "M"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{member.user?.name}</span>
                                            <span className="text-xs text-muted-foreground">{member.user?.email}</span>
                                        </div>
                                    </div>
                                    {selectedMemberId === member.user?._id && (
                                        <Check className="size-4 text-blue-600" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    No other members found to transfer ownership to.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Invite members from the Members page first.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            disabled={!selectedMemberId || isTransferring}
                            onClick={handleTransfer}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isTransferring ? "Transferring..." : "Transfer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* 3. DANGER ZONE */}
      <div className="border rounded-lg p-6 bg-red-50 border-red-100 shadow-sm flex flex-col gap-y-4">
        <div>
            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
            <p className="text-sm text-red-500/80">
                Irreversible actions for your workspace.
            </p>
        </div>
        <div className="flex justify-start">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="destructive" className="w-fit bg-red-600 hover:bg-red-700">
                        Delete Workspace
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your workspace 
                            and remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            disabled={isDeleting}
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Deleting..." : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

    </div>
  );
}