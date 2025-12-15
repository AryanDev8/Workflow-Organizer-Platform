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
    route("my-tasks","routes/root/dashboard/my-tasks.tsx"),
    route("members","routes/root/dashboard/members.tsx"),
    route("achieved", "routes/root/dashboard/achieved.tsx"),
    route("settings", "routes/root/dashboard/settings.tsx")
   ]),

   route("workspace-invite/:workspaceId","routes/root/dashboard/workspaces/workspace-invite.tsx"),

   layout("routes/root/user/user-layout.tsx", [
    route("user/profile","routes/root/user/profile.tsx"),
   ]),

] satisfies RouteConfig;
