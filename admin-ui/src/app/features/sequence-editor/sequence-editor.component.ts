import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { catchError, of } from "rxjs";
import { SequenceService } from "../../core/services/sequence.service";
import { SequenceStep } from "../../core/models/sequence-step.model";

@Component({
  selector: "cad-sequence-editor",
  standalone: true,
  imports: [NgForOf, NgIf],
  templateUrl: "./sequence-editor.component.html",
  styleUrl: "./sequence-editor.component.scss",
})
export class SequenceEditorComponent implements OnInit {
  private readonly sequenceService = inject(SequenceService);

  protected steps: SequenceStep[] = [];
  protected loading = true;

  public ngOnInit(): void {
    this.loadSteps();
  }

  protected toggleStep(step: SequenceStep): void {
    const updated: SequenceStep = { ...step, enabled: !step.enabled };
    this.steps = this.steps.map((s) => (s.id === step.id ? updated : s));
    this.sequenceService.updateStep(updated).subscribe();
  }

  protected triggerLabel(step: SequenceStep): string {
    if (step.triggerType === "time") {
      return step.delayIntervalDays === 0 ? "day 0" : `+${step.delayIntervalDays} days`;
    }
    return `on ${step.eventCondition?.replace("on_", "")}`;
  }

  protected trackByStepId(_index: number, step: SequenceStep): number {
    return step.id;
  }

  private loadSteps(): void {
    this.loading = true;
    this.sequenceService
      .getSteps()
      .pipe(
        catchError((): ReturnType<typeof of<SequenceStep[]>> => {
          // n8n webhook not wired up yet during scaffold — fail quiet, show empty state.
          return of([]);
        })
      )
      .subscribe((steps: SequenceStep[]) => {
        this.steps = steps;
        this.loading = false;
      });
  }
}
