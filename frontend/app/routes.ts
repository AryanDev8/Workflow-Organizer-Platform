import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/root/auth/auth-layout.tsx",[
        index("routes/root/home.tsx"),
        route("sign-in","routes/root/auth/sign-in.tsx"),
        route("sign-up","routes/root/auth/sign-up.tsx"),
        route("forgot-password","routes/root/auth/forgot-password.tsx"),
        route("reset-password","routes/root/auth/reset-password.tsx"),
        route("verify-email",   "routes/root/auth/verify-email.tsx"),
    ]),

   layout("routes/root/dashboard/dashboard-layout.tsx",[
    route("dashboard","routes/root/dashboard/index.tsx"),
    route("workspaces","routes/root/dashboard/workspaces/index.tsx"),
    route("workspaces/:workspaceId","routes/root/dashboard/workspaces/workspace-details.tsx"),
    route("workspaces/:workspaceId/projects/:projectId","routes/root/dashboard/project/project-details.tsx"),
    route("workspaces/:workspaceId/projects/:projectId/tasks/:taskId","routes/root/dashboard/task/task-details.tsx"),
   ]),

] satisfies RouteConfig;
