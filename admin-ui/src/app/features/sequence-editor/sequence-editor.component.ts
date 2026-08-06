import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CdkDragDrop, DragDropModule, moveItemInArray } from "@angular/cdk/drag-drop";
import { Observable, catchError, of } from "rxjs";
import { SequenceService } from "../../core/services/sequence.service";
import { DelayUnit, SequenceStep } from "../../core/models/sequence-step.model";

@Component({
  selector: "cad-sequence-editor",
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule, DragDropModule],
  templateUrl: "./sequence-editor.component.html",
  styleUrl: "./sequence-editor.component.scss",
})
export class SequenceEditorComponent implements OnInit {
  private readonly sequenceService = inject(SequenceService);

  protected steps: SequenceStep[] = [];
  protected loading = true;
  protected readonly delayUnits: DelayUnit[] = ["hours", "days"];

  public ngOnInit(): void {
    this.loadSteps();
  }

  protected toggleStep(step: SequenceStep): void {
    const updated: SequenceStep = { ...step, enabled: !step.enabled };
    this.steps = this.steps.map((s) => (s.id === step.id ? updated : s));
    this.sequenceService.updateStep(updated).subscribe();
  }

  protected updateDelayValue(step: SequenceStep, value: string): void {
    const updated: SequenceStep = { ...step, delayValue: Number(value) };
    this.steps = this.steps.map((s) => (s.id === step.id ? updated : s));
    this.sequenceService.updateStep(updated).subscribe();
  }

  protected updateDelayUnit(step: SequenceStep, unit: string): void {
    const updated: SequenceStep = { ...step, delayUnit: unit as DelayUnit };
    this.steps = this.steps.map((s) => (s.id === step.id ? updated : s));
    this.sequenceService.updateStep(updated).subscribe();
  }

  protected eventLabel(step: SequenceStep): string {
    return `on ${step.eventCondition?.replace("on_", "")}`;
  }

  protected onDrop(event: CdkDragDrop<SequenceStep[]>): void {
    const reordered = [...this.steps];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.steps = reordered;
    this.sequenceService.reorderSteps(reordered.map((s) => s.id)).subscribe();
  }

  protected trackByStepId(_index: number, step: SequenceStep): number {
    return step.id;
  }

  private loadSteps(): void {
    this.loading = true;
    this.sequenceService
      .getSteps()
      .pipe(
        catchError((): Observable<SequenceStep[]> => {
          // n8n webhook not wired up yet during scaffold — fail quiet, show empty state.
          return of([]);
        })
      )
      .subscribe((steps: SequenceStep[]) => {
        // Event-triggered steps may still have a null delay from before every
        // step type got an editable Time field — default them for display.
        this.steps = steps.map((step) => ({
          ...step,
          delayValue: step.delayValue ?? 0,
          delayUnit: step.delayUnit ?? "hours",
        }));
        this.loading = false;
      });
  }
}
