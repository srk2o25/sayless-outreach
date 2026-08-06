import { Component, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../core/services/auth.service";

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: "cad-layout",
  standalone: true,
  imports: [NgForOf, NgIf, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.scss",
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems: NavItem[] = [
    { label: "Batches", route: "/batches" },
    { label: "Prospects", route: "/prospects" },
    { label: "Sequence", route: "/sequence" },
    { label: "Templates", route: "/templates" },
    { label: "Accounts", route: "/linkedin-connection" },
  ];

  protected trackByRoute(_index: number, item: NavItem): string {
    return item.route;
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl("/login");
  }
}
