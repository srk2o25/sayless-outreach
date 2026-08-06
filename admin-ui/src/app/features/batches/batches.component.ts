import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, catchError, of } from "rxjs";
import { BatchesService } from "../../core/services/batches.service";
import { Campaign } from "../../core/models/campaign.model";
import { TemplatesService } from "../../core/services/templates.service";
import { TemplateCategory } from "../../core/models/template-category.model";

@Component({
  selector: "cad-batches",
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule],
  templateUrl: "./batches.component.html",
  styleUrl: "./batches.component.scss",
})
export class BatchesComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);
  private readonly templatesService = inject(TemplatesService);

  protected campaigns: Campaign[] = [];
  protected loading = true;
  protected uploading = false;
  protected justUploaded = false;
  protected runningPipeline = false;
  protected pipelineResult: string | null = null;
  protected templateCategories: TemplateCategory[] = [];
  protected selectedTemplateCategoryId: number | null = null;
  protected uploadError: string | null = null;

  public ngOnInit(): void {
    this.loadCampaigns();
    this.loadTemplateCategories();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.selectedTemplateCategoryId === null) {
      this.uploadError = "Pick a template category before uploading.";
      input.value = "";
      return;
    }

    this.uploadError = null;
    this.uploading = true;
    this.batchesService
      .uploadBatch(file, file.name, this.selectedTemplateCategoryId)
      .pipe(
        catchError((): Observable<Campaign | null> => {
          return of(null);
        })
      )
      .subscribe((campaign: Campaign | null) => {
        this.uploading = false;
        if (campaign) {
          this.campaigns = [campaign, ...this.campaigns];
          this.justUploaded = true;
        }
        input.value = "";
      });
  }

  protected runPipelineNow(): void {
    this.runningPipeline = true;
    this.pipelineResult = null;
    this.justUploaded = false;
    this.batchesService
      .runPipelineNow()
      .pipe(
        catchError((): Observable<"failed"> => {
          return of("failed");
        })
      )
      .subscribe((result: void | "failed") => {
        this.runningPipeline = false;
        this.pipelineResult =
          result === "failed"
            ? "Couldn't reach n8n — check it's running."
            : "Pipeline triggered — check Prospects in a few seconds for the result.";
      });
  }

  protected trackByCampaignId(_index: number, campaign: Campaign): number {
    return campaign.id;
  }

  protected deleteCampaign(campaign: Campaign): void {
    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This permanently removes the campaign and all its prospects/history — this can't be undone.`
    );
    if (!confirmed) return;

    this.batchesService
      .deleteCampaign(campaign.id)
      .pipe(
        catchError((): Observable<{ ok: boolean; id: number | null }> => {
          return of({ ok: false, id: null });
        })
      )
      .subscribe((result: { ok: boolean; id: number | null }) => {
        if (result.ok) {
          this.campaigns = this.campaigns.filter((c) => c.id !== campaign.id);
        }
      });
  }

  protected downloadSampleCsv(): void {
    const csv =
      "full_name,company,email,linkedin_url\n" +
      "Jane Doe,Acme Inc,jane.doe@acme.com,https://www.linkedin.com/in/jane-doe-123456/\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sayless-outreach-sample-prospects.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadCampaigns(): void {
    this.loading = true;
    this.batchesService
      .listCampaigns()
      .pipe(
        catchError((): Observable<Campaign[]> => {
          return of([]);
        })
      )
      .subscribe((campaigns: Campaign[]) => {
        this.campaigns = campaigns;
        this.loading = false;
      });
  }

  private loadTemplateCategories(): void {
    this.templatesService
      .listCategories()
      .pipe(
        catchError((): Observable<TemplateCategory[]> => {
          return of([]);
        })
      )
      .subscribe((categories: TemplateCategory[]) => {
        this.templateCategories = categories;
      });
  }
}
