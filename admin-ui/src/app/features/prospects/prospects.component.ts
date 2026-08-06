import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf, NgSwitch, NgSwitchCase } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, catchError, of } from "rxjs";
import { BatchesService } from "../../core/services/batches.service";
import { Prospect } from "../../core/models/prospect.model";
import { Campaign } from "../../core/models/campaign.model";
import { TimelineStep } from "../../core/models/prospect-timeline.model";

interface EditForm {
  fullName: string;
  company: string;
  email: string;
  linkedinUrl: string;
}

@Component({
  selector: "cad-prospects",
  standalone: true,
  imports: [NgForOf, NgIf, NgSwitch, NgSwitchCase, FormsModule],
  templateUrl: "./prospects.component.html",
  styleUrl: "./prospects.component.scss",
})
export class ProspectsComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);

  protected campaigns: Campaign[] = [];
  protected selectedCampaignId: number | null = null;
  protected prospects: Prospect[] = [];
  protected loading = true;
  protected editingId: number | null = null;
  protected editForm: EditForm = { fullName: "", company: "", email: "", linkedinUrl: "" };
  protected timelineProspect: Prospect | null = null;
  protected timelineSteps: TimelineStep[] = [];
  protected timelineLoading = false;
  protected timelineError = false;

  public ngOnInit(): void {
    this.loadCampaigns();
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

  protected trackByCampaignId(_index: number, campaign: Campaign): number {
    return campaign.id;
  }

  protected onCampaignChange(campaignId: string): void {
    this.selectedCampaignId = Number(campaignId);
    this.loadProspects();
  }

  protected startEdit(prospect: Prospect): void {
    this.editingId = prospect.id;
    this.editForm = {
      fullName: prospect.fullName,
      company: prospect.company ?? "",
      email: prospect.email ?? "",
      linkedinUrl: prospect.linkedinUrl ?? "",
    };
  }

  protected cancelEdit(): void {
    this.editingId = null;
  }

  protected saveEdit(prospect: Prospect): void {
    const updated: Prospect = {
      ...prospect,
      fullName: this.editForm.fullName,
      company: this.editForm.company || null,
      email: this.editForm.email || null,
      linkedinUrl: this.editForm.linkedinUrl || null,
    };
    this.prospects = this.prospects.map((p) => (p.id === prospect.id ? updated : p));
    this.editingId = null;
    this.batchesService.updateProspect(updated).subscribe();
  }

  protected togglePause(prospect: Prospect): void {
    const updated: Prospect = { ...prospect, halted: !prospect.halted };
    this.prospects = this.prospects.map((p) => (p.id === prospect.id ? updated : p));
    this.batchesService.updateProspect(updated).subscribe();
  }

  protected archiveProspect(prospect: Prospect): void {
    const updated: Prospect = { ...prospect, archived: true };
    // Default list view excludes archived prospects — drop it locally rather
    // than waiting on a full reload.
    this.prospects = this.prospects.filter((p) => p.id !== prospect.id);
    this.batchesService.updateProspect(updated).subscribe();
  }

  protected openTimeline(prospect: Prospect): void {
    this.timelineProspect = prospect;
    this.timelineSteps = [];
    this.timelineError = false;
    this.timelineLoading = true;
    this.batchesService
      .getProspectTimeline(prospect.id)
      .pipe(
        catchError((): Observable<null> => {
          this.timelineError = true;
          return of(null);
        })
      )
      .subscribe((timeline) => {
        this.timelineSteps = timeline?.timeline ?? [];
        this.timelineLoading = false;
      });
  }

  protected closeTimeline(): void {
    this.timelineProspect = null;
  }

  protected trackByTimelineStepId(_index: number, step: TimelineStep): number {
    return step.stepId;
  }

  protected timelineStatusLabel(step: TimelineStep): string {
    switch (step.status) {
      case "completed":
        return "Sent";
      case "skipped":
        return "Failed — proceeded anyway";
      case "pending":
        return "Due";
      default:
        return "Upcoming";
    }
  }

  // Every step (time or event) now fires on a fixed delay chained off the
  // previous step's actual timestamp, success or failure — see CLAUDE.md.
  // occurredAt is in the past (completed/skipped), dueAt is a projection.
  protected timelineTimeLabel(step: TimelineStep): string {
    if (step.occurredAt) {
      return `${this.relativeTime(step.occurredAt)} ago`;
    }
    if (step.dueAt) {
      const deltaMs = new Date(step.dueAt).getTime() - Date.now();
      return deltaMs <= 0 ? "due now" : `in ${this.relativeTime(step.dueAt)}`;
    }
    return "";
  }

  private relativeTime(iso: string): string {
    const deltaMs = Math.abs(Date.now() - new Date(iso).getTime());
    const minutes = Math.round(deltaMs / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  private loadCampaigns(): void {
    this.batchesService
      .listCampaigns()
      .pipe(
        catchError((): Observable<Campaign[]> => {
          return of([]);
        })
      )
      .subscribe((campaigns: Campaign[]) => {
        this.campaigns = campaigns;
        // admin-list-campaigns orders by created_at DESC, so index 0 is most recent.
        this.selectedCampaignId = campaigns.length > 0 ? campaigns[0].id : null;
        this.loadProspects();
      });
  }

  private loadProspects(): void {
    if (this.selectedCampaignId === null) {
      this.prospects = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.batchesService
      .listProspects(this.selectedCampaignId)
      .pipe(
        catchError((): Observable<Prospect[]> => {
          return of([]);
        })
      )
      .subscribe((prospects: Prospect[]) => {
        this.prospects = prospects;
        this.loading = false;
      });
  }
}
