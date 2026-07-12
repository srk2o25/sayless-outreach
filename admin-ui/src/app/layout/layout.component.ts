import { Component } from "@angular/core";
import { NgForOf } from "@angular/common";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: "cad-layout",
  standalone: true,
  imports: [NgForOf, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.scss",
})
export class LayoutComponent {
  protected readonly navItems: NavItem[] = [
    { label: "Prospects", route: "/prospects" },
    { label: "Sequence", route: "/sequence" },
    { label: "Batches", route: "/batches" },
  ];

  protected trackByRoute(_index: number, item: NavItem): string {
    return item.route;
  }
}
