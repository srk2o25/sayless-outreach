import { Routes } from "@angular/router";
import { LayoutComponent } from "./layout/layout.component";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./features/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "", redirectTo: "batches", pathMatch: "full" },
      {
        path: "prospects",
        loadComponent: () => import("./features/prospects/prospects.component").then((m) => m.ProspectsComponent),
      },
      {
        path: "sequence",
        loadComponent: () =>
          import("./features/sequence-editor/sequence-editor.component").then((m) => m.SequenceEditorComponent),
      },
      {
        path: "batches",
        loadComponent: () => import("./features/batches/batches.component").then((m) => m.BatchesComponent),
      },
      {
        path: "templates",
        loadComponent: () => import("./features/templates/templates.component").then((m) => m.TemplatesComponent),
      },
      {
        path: "linkedin-connection",
        loadComponent: () =>
          import("./features/linkedin-connection/linkedin-connection.component").then(
            (m) => m.LinkedinConnectionComponent
          ),
      },
    ],
  },
];
