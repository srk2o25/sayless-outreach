import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { catchError, of } from "rxjs";
import { BatchesService } from "../../core/services/batches.service";
import { Campaign } from "../../core/models/campaign.model";

@Component({
  selector: "cad-batches",
  standalone: true,
  imports: [NgForOf, NgIf],
  templateUrl: "./batches.component.html",
  styleUrl: "./batches.component.scss",
})
export class BatchesComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);

  protected campaigns: Campaign[] = [];
  protected loading = true;
  protected uploading = false;

  public ngOnInit(): void {
    this.loadCampaigns();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.batchesService
      .uploadBatch(file, file.name)
      .pipe(
        catchError((): ReturnType<typeof of<Campaign | null>> => {
          return of(null);
        })
      )
      .subscribe((campaign: Campaign | null) => {
        this.uploading = false;
        if (campaign) this.campaigns = [campaign, ...this.campaigns];
        input.value = "";
      });
  }

  protected trackByCampaignId(_index: number, campaign: Campaign): number {
    return campaign.id;
  }

  private loadCampaigns(): void {
    this.loading = true;
    this.batchesService
      .listCampaigns()
      .pipe(
        catchError((): ReturnType<typeof of<Campaign[]>> => {
          return of([]);
        })
      )
      .subscribe((campaigns: Campaign[]) => {
        this.campaigns = campaigns;
        this.loading = false;
      });
  }
}
