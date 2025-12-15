import { Link, useSearchParams } from "react-router"; 
import { Loader, Layers } from "lucide-react";
import { format } from "date-fns";

// --- IMPORTS ---
import { useGetWorkspaceQuery } from "../../../hooks/use-workspace";
import { useGetMyTasksQuery } from "../../../hooks/use-task";
import { Button } from "../../../components/ui/button";

// --- TYPES ---
interface Project {
  _id: string;   
  name: string;
  status?: string;
  isArchived?: boolean; 
  updatedAt?: string; 
}

interface Task {
  _id: string;   
  title: string; 
  status?: string;
  priority?: string;
  isArchived?: boolean;
  project?: { name?: string; title?: string };
  updatedAt?: string;
}

export default function AchievedPage() {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") || "";

  // Fetch Data
  const { data: projectsData, isLoading: isLoadingProjects } = useGetWorkspaceQuery(workspaceId);
  const { data: tasksData, isLoading: isLoadingTasks } = useGetMyTasksQuery();

  const isLoading = isLoadingProjects || isLoadingTasks;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- FIX: Force 'any' type & Ensure Array ---
  const rawProjects = projectsData as any;
  const rawTasks = tasksData as any;

  // Safe Data Access:
  // 1. Check if it's already an array.
  // 2. If not, check for .documents (Appwrite style).
  // 3. If neither, fallback to empty array [] (Prevent .filter crash)
  const projects = (Array.isArray(rawProjects) ? rawProjects : rawProjects?.documents || []) as Project[];
  const tasks = (Array.isArray(rawTasks) ? rawTasks : rawTasks?.documents || []) as Task[];

  // Filter Logic
  // Now 'projects' and 'tasks' are guaranteed to be arrays, so .filter will work.
  const archivedProjects = projects.filter((project) => project.isArchived === true);
  const archivedTasks = tasks.filter((task) => task.isArchived === true);

  // Empty State
  if (archivedProjects.length === 0 && archivedTasks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-y-4">
        <div className="size-16 bg-muted rounded-full flex items-center justify-center">
             <Layers className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">No archived items found</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          You can archive tasks to keep them out of your way. 
        </p>
        <Button variant="default" size="sm" asChild>
            <Link to={workspaceId ? `/workspaces/${workspaceId}` : "/dashboard"}>
                Go Back
            </Link>
        </Button>
      </div>
    );
  }

  // Render Tables
  return (
    <div className="flex flex-col gap-y-8 p-6 w-full">
      {/* ARCHIVED PROJECTS */}
      {archivedProjects.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <h2 className="text-xl font-bold">Archived Projects</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {archivedProjects.map((project) => (
                  <tr key={project._id} className="bg-white hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">
                        <div className="flex flex-col">
                            <span>{project.name}</span>
                            <span className="text-xs text-muted-foreground">Project</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">{project.status || "N/A"}</td>
                    <td className="px-4 py-3">0%</td>
                    <td className="px-4 py-3 text-muted-foreground">
                        {project.updatedAt ? format(new Date(project.updatedAt), "PPP") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARCHIVED TASKS */}
      {archivedTasks.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <h2 className="text-xl font-bold">Archived Tasks</h2>
          <div className="border rounded-lg overflow-hidden">
             <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {archivedTasks.map((task) => (
                  <tr key={task._id} className="bg-white hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">
                         <div className="flex flex-col">
                            <span>{task.title}</span> 
                            <span className="text-xs text-muted-foreground">Task</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">{task.status}</td>
                    <td className="px-4 py-3">{task.priority || "Normal"}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">
                        {task.project?.name || task.project?.title || "Unknown Project"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                        {task.updatedAt ? format(new Date(task.updatedAt), "PPP") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}