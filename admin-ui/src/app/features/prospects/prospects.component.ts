import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { catchError, of } from "rxjs";
import { BatchesService } from "../../core/services/batches.service";
import { Prospect } from "../../core/models/prospect.model";

const DEFAULT_CAMPAIGN_ID = 1;

@Component({
  selector: "cad-prospects",
  standalone: true,
  imports: [NgForOf, NgIf],
  templateUrl: "./prospects.component.html",
  styleUrl: "./prospects.component.scss",
})
export class ProspectsComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);

  protected prospects: Prospect[] = [];
  protected loading = true;

  public ngOnInit(): void {
    this.loadProspects();
  }

  protected initials(fullName: string): string {
    return fullName
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  protected trackByProspectId(_index: number, prospect: Prospect): number {
    return prospect.id;
  }

  private loadProspects(): void {
    this.loading = true;
    this.batchesService
      .listProspects(DEFAULT_CAMPAIGN_ID)
      .pipe(
        catchError((): ReturnType<typeof of<Prospect[]>> => {
          // n8n webhook not wired up yet during scaffold — fail quiet, show empty state.
          return of([]);
        })
      )
      .subscribe((prospects: Prospect[]) => {
        this.prospects = prospects;
        this.loading = false;
      });
  }
}
