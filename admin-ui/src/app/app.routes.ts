import { Routes } from "@angular/router";
import { LayoutComponent } from "./layout/layout.component";

export const routes: Routes = [
  {
    path: "",
    component: LayoutComponent,
    children: [
      { path: "", redirectTo: "prospects", pathMatch: "full" },
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
        path: "linkedin-connection",
        loadComponent: () =>
          import("./features/linkedin-connection/linkedin-connection.component").then(
            (m) => m.LinkedinConnectionComponent
          ),
      },
    ],
  },
];
